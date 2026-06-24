# Ratchet — Test Strategy (the testing pyramid for a prover)

**Status:** Draft v0.1 · Read `../architecture/proof-gate.md`, `../architecture/overview.md`, and `../product/definition-of-done.md` first.

> Ratchet's product *is* proof. So our test strategy inverts the usual emphasis: the most
> expensive, most important tests are the **meta-evals** that test the prover itself
> (`meta-evals.md`). Everything below the gate exists to make the gate trustworthy. A green
> `pnpm test` means "the machinery is correct"; a green `pnpm eval` means "the proof is real."
> A learning feature is **not done** without the latter (`definition-of-done.md` §3, AGENTS.md §Test commands).

---

## 1. Two test commands, one hard line between them

```
pnpm test   →  unit + integration. DETERMINISTIC. All model calls MOCKED. Runs on every PR, fast.
pnpm eval   →  meta-evals + property/perf. LIVE models ALLOWED. Gated, slower, cost-bounded.
```

The line is non-negotiable (AGENTS.md §Test commands):

- **`pnpm test` never makes a live model call.** No network, no API keys, no nondeterminism. If a
  test needs a model, it uses the deterministic **fake provider** (`fixtures.md` §5). A live call
  leaking into `pnpm test` is a bug — it makes CI flaky, costly, and non-reproducible.
- **Live-model tests live only in `*.eval.ts`** under `pnpm eval`. They carry their own budget
  guards (`maxTrials`, `maxCostUSD`) and are the only place a real provider is exercised.

This separation is what lets `pnpm test` gate every PR while `pnpm eval` gates the **learning path**
and **releases**.

---

## 2. The pyramid (for THIS product)

```
                          ┌───────────────────────────┐
                          │   performance / cost        │  small, budget-bounded
                          │   (latency, $/eval, memory) │
                          ├───────────────────────────┤
                          │   META-EVALS (the prover)   │  ⭐ the point of the product
                          │   false-promote/reject rates│  pnpm eval · live or recorded
                          ├───────────────────────────┤
                          │   property / fuzz           │  distiller on arbitrary input
                          │   (sanitize, schema, idemp.)│
                          ├───────────────────────────┤
                          │   integration               │  pipeline on fixtures, MOCKED models
                          │   capture→distill→prove→…   │  pnpm test
                          ├───────────────────────────┤
                          │   unit (DETERMINISTIC)      │  schema, parsing, storage,
                          │   the wide base             │  config, CLI · pnpm test
                          └───────────────────────────┘
```

Note the meta-eval tier is **not** the tip-of-the-pyramid afterthought it would be in a normal
product. It is the load-bearing tier. We tolerate a smaller, slower top because each case there is
worth more than a thousand unit tests of glue code.

---

## 3. Tier by tier

### 3.1 Unit — deterministic, the wide base (`pnpm test`)

Pure, fast, no I/O, no models. This is where most lines of test live.

| Area | What we assert | Example |
|---|---|---|
| **Schema** (`@ratchet/schema`) | Every object parses/rejects correctly; round-trips survive serialize→parse; invariants hold | a `Skill` with `status:"promoted"` but no `pass` ProofRun is **rejected** (skill-schema §8.2) |
| **Migrations** | `<from>-<to>.ts` migrates forward; round-trip test; unknown fields preserved | `0.1.0 → 0.2.0` keeps an unrecognized field intact (skill-schema §7) |
| **Parsing** | Note/markdown ↔ object; vault-region delimiters; ledger lines | a managed-region block parses and re-renders byte-identical |
| **Storage** | `.ratchet/` files + SQLite index agree; append-only ledger never rewrites history | appending a `LedgerEntry` leaves prior lines untouched |
| **Config** | Precedence (flags > env > file > defaults); Zod refines; exit `3` on invalid | `proposer == verifier` config ⇒ `CONFIG_INVALID` (config-schema §2) |
| **CLI** | Command parsing, flag wiring, exit codes, human-readable error text | `ratchet verify` with no verifier exits non-zero with the doctor hint |
| **Pure core helpers** | `significantlyBetter`, `hasRegressions`, budget accounting, hashing | `significantlyBetter` returns `false` when the CI includes zero (proof-gate §3) |

```ts
// packages/schema/test/skill.invariants.test.ts
import { describe, it, expect } from "vitest";
import { SkillSchema } from "@ratchet/schema";
import { makePromotedSkill } from "@ratchet/schema/testing"; // builders, fixtures.md §2

describe("Skill invariant: promoted requires a passing proof", () => {
  it("rejects status:promoted with no passing ProofRun", () => {
    const bad = { ...makePromotedSkill(), proofs: [] }; // strip the evidence
    const res = SkillSchema.safeParse(bad);
    expect(res.success).toBe(false);
  });

  it("rejects verifierConfigHash === proposerConfigHash (independence)", () => {
    const s = makePromotedSkill();
    s.proofs[0].manifest.verifierConfigHash = s.provenance.proposerConfigHash;
    expect(SkillSchema.safeParse(s).success).toBe(false);
  });
});
```

**Coverage expectation:** `@ratchet/schema` and the pure functions in `@ratchet/core`
(`promotion`, `significance`, `regression`, redaction) are the trust-critical core — hold them to
**≥ 95% line + branch**, and **100% on the invariant branches** (every `fail-closed` path must be
exercised). Glue/CLI code: changed lines must not drop coverage (DoD §1).

### 3.2 Integration — the pipeline on fixtures, models mocked (`pnpm test`)

Exercises `capture → distill → prove → promote → ledger` end-to-end against **golden fixtures**
(`fixtures.md`) with the **fake provider** standing in for every model. Deterministic, so we can
snapshot exact outputs.

What integration tests prove:

- A known session fixture distills into the expected Notes + candidate Skills.
- A candidate that *should* pass (fake provider scripted to grade it better, no regressions) is
  promoted **only through `@ratchet/core/promotion`**, writes a complete ProofRun manifest, and
  appends exactly one `LedgerEntry` (AGENTS.md invariants 1, 7).
- A candidate that regresses a prior skill is **rejected** and nothing is promoted (forward-only).
- **Fail-closed:** if the regression suite can't run (fake provider throws), promotion fails and the
  active set is unchanged (proof-gate §6, DoD §3).
- No secret/PII fixture value ever lands in a vault/ledger/manifest output (AGENTS.md invariant 5).

```ts
// packages/core/test/pipeline.fail-closed.test.ts
import { describe, it, expect } from "vitest";
import { runPipeline } from "@ratchet/core";
import { FakeProvider } from "@ratchet/providers/testing";
import { loadFixture } from "@ratchet/core/testing";

it("fails closed when regression suite cannot run", async () => {
  const verifier = new FakeProvider({
    script: "grade-better",
    throwOn: "regression",       // simulate the regression run crashing
  });
  const ctx = loadFixture("sessions/db-migration-gotcha");

  const result = await runPipeline(ctx, { verifier });

  expect(result.promoted).toHaveLength(0);          // nothing slipped through
  expect(result.verdict).toBe("fail");
  expect(result.reason).toMatch(/regression.*could not run/i);
  expect(ctx.ledger.entries).toHaveLength(0);        // ledger untouched
});
```

Integration tests use the fake provider — **mocked, not live** — precisely so they can run on every
PR. They prove the *plumbing* around the gate. Whether the gate's *judgement* is correct is the job
of the meta-evals (§3.4).

### 3.3 Property / fuzz — the distiller on arbitrary input (`pnpm test`, fast-check)

The distiller ingests **untrusted** conversation (a memory-poisoning / prompt-injection vector —
AGENTS.md §Security, `../security/threat-model.md`). We fuzz it with arbitrary, hostile, and
malformed transcripts and assert **invariants that must hold for all inputs**, not specific outputs:

- **No crash, bounded output:** any transcript (including adversarial / injection strings) yields a
  schema-valid result or a typed error — never an unhandled throw, never unbounded growth.
- **Sanitization holds:** for all inputs, no secret-shaped string (API-key patterns, emails,
  tokens seeded into the transcript) survives into any `Note.body`, `Skill.body`, or manifest.
- **Schema-validity:** every produced object passes `@ratchet/schema` parse (boundary validation,
  AGENTS.md §Code style).
- **Idempotence / determinism under fake provider:** same transcript + same seed ⇒ same candidates.
- **No promotion from distillation alone:** the distiller never sets `status:"promoted"` — only the
  gate can (invariant 1).

```ts
// packages/core/test/distill.properties.test.ts
import { it, expect } from "vitest";
import fc from "fast-check";
import { distill } from "@ratchet/core";
import { FakeProvider } from "@ratchet/providers/testing";
import { SkillSchema, NoteSchema } from "@ratchet/schema";
import { containsSecretShape } from "@ratchet/core/redaction";

it("distillation sanitizes and stays schema-valid for ANY transcript", () => {
  fc.assert(
    fc.property(fc.string(), (raw) => {
      // Inject a fake secret to prove redaction holds for all inputs.
      const fakeSecret = ["sk-live", "DEADBEEFsecrettoken"].join("-");
      const transcript = `${raw}\nAPI key ${fakeSecret}`;
      const out = distill(transcript, { provider: new FakeProvider({ seed: 1 }) });

      out.notes.forEach((n) => expect(NoteSchema.safeParse(n).success).toBe(true));
      out.candidates.forEach((s) => expect(SkillSchema.safeParse(s).success).toBe(true));

      const allText = [...out.notes, ...out.candidates].map((o) => o.body).join("\n");
      expect(containsSecretShape(allText)).toBe(false);           // nothing leaked
      out.candidates.forEach((s) => expect(s.status).not.toBe("promoted")); // gate-only
    }),
    { numRuns: 500 },
  );
});
```

### 3.4 Meta-evals — testing the prover (`pnpm eval`) ⭐

The center of gravity. A **labeled corpus** of known-good and known-bad candidate skills is run
through the *real* proof gate; we measure **false-promote rate** (a bad skill promoted) and
**false-reject rate** (a good skill rejected) and gate releases on the thresholds in
`../../evals/THRESHOLDS.md`. Full design — corpus construction, hold-out, evaluator-independence
checks, example cases and assertions — is in **`meta-evals.md`**. This is the tier that makes a
learning feature "done."

### 3.5 Performance & cost (`pnpm eval`, budget-bounded)

The gate spends money and time; runaway cost is a correctness bug (AGENTS.md invariant 6). We assert:

- **Budget enforcement:** an evaluation honors `maxTrials`, `maxCostUSD`, `maxIterations`; exceeding
  any ⇒ fail-closed, no promotion (proof-gate §7). Tested with a fake provider that reports cost.
- **Cost envelope per eval** stays under a tracked ceiling; regressions in $/eval fail the perf job.
- **Latency budget** for `watch`/`verify` on a reference machine stays within target.
- **Tiered escalation works:** cheap verifier first, panel only on borderline cases — we assert the
  panel is *not* invoked on obvious cases (a cost-control property, proof-gate §7).

---

## 4. What to mock, and where live is allowed

| Component | In `pnpm test` | In `pnpm eval` |
|---|---|---|
| Model / agent providers | **Fake provider** (deterministic, scripted) — always | **Live** providers allowed (recorded or real), budget-guarded |
| Host-agent adapter | Fake transcript fixtures | Live capture allowed in adapter eval only |
| Filesystem / vault | Temp dir under the test's control | Temp dir |
| Clock / ULID / RNG | Injected, frozen/seeded | Seeded where supported |
| Network | **Forbidden** (assert no socket opens) | Allowed to providers only |

Rules of thumb:

- **Mock the model, never the gate.** We mock *what the gate calls* (providers), never the gate's
  own logic — meta-evals must run the real `evaluate()`.
- **Inject nondeterminism sources** (clock, RNG, ULID, seed) so unit/integration stay reproducible
  (`non-determinism.md`).
- **Record-and-replay** is the bridge: meta-evals may capture real provider responses once into
  cassettes and replay them deterministically in cheaper runs (`non-determinism.md` §3,
  `fixtures.md` §4).

---

## 5. CI gating

| Stage | Command | Blocks merge? | Blocks release? |
|---|---|---|---|
| typecheck | `pnpm typecheck` | ✅ | ✅ |
| lint/format | `pnpm lint` | ✅ | ✅ |
| unit + integration | `pnpm test` | ✅ (every PR) | ✅ |
| property/fuzz | part of `pnpm test` | ✅ | ✅ |
| **meta-evals** | `pnpm eval` | ✅ **only on learning-path PRs** (distill/proof/regression/promotion) | ✅ **always on the RC** |
| performance/cost | part of `pnpm eval` | report on PR; ❌ hard-block unless budget regressed | ✅ |

- **Every PR:** `pnpm typecheck && pnpm lint && pnpm test` must pass (AGENTS.md §Commit & PR).
- **Learning-path PRs additionally:** `pnpm eval` must pass within `THRESHOLDS.md` (DoD §3). A PR is
  "learning-path" if it touches `@ratchet/core` distillation, proof, regression, or promotion, the
  proof-gate config surface, or the meta-eval corpus itself.
- **Releases:** `pnpm eval` green on the release candidate is a Release-DoD gate (DoD §6).
- Meta-evals are **cost-bounded in CI** via recorded cassettes by default; a scheduled job runs the
  live variant on a cadence (`non-determinism.md` §3) so cassettes can't silently drift from reality.

---

## 6. Coverage expectations (summary)

- Trust-critical core (`@ratchet/schema`, `core/promotion`, `core/significance`, `core/regression`,
  redaction): **≥ 95% line + branch**, **100% of fail-closed branches** exercised.
- Everything else: changed lines must not lower coverage (DoD §1).
- Coverage is **necessary, not sufficient.** 100% line coverage of the gate proves nothing about
  whether the gate's *verdicts* are right — that is what the meta-eval **rates** measure. We report
  both and never trade one for the other.

---

## 7. Anti-patterns (release-blocking, not nits)

- ❌ A live model call inside `pnpm test`.
- ❌ Asserting on a model's exact prose instead of a structured, schema-validated field.
- ❌ Mocking `@ratchet/core/promotion` or the gate's verdict logic in a meta-eval.
- ❌ A "force promote" path or any promotion not routed through `@ratchet/core/promotion`.
- ❌ Snapshotting a nondeterministic value without a tolerance/range (`non-determinism.md`).
- ❌ Marking a learning feature done with a green `pnpm test` but no passing `pnpm eval`.

---

## 8. Related docs
`meta-evals.md` · `fixtures.md` · `non-determinism.md` · `../../evals/THRESHOLDS.md` ·
`../architecture/proof-gate.md` · `../architecture/skill-schema.md` · `../product/definition-of-done.md` ·
`../security/threat-model.md`
