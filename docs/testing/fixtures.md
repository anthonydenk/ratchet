# Ratchet — Test Fixtures (the golden corpus)

**Status:** Draft v0.1 · Read `test-strategy.md`, `meta-evals.md`, and `../architecture/skill-schema.md` first.

> Fixtures are how a prover stays honest. Every deterministic test and every meta-eval case is backed
> by a **schema-valid, version-controlled fixture** — sample sessions, known-good/known-bad skills,
> sample ProofRuns, and the **deterministic fake provider** that lets us test model-shaped behavior
> with zero live calls. Fixtures are **built through `@ratchet/schema`**, never hand-edited as raw
> JSON in ways that could drift from the schema (AGENTS.md invariant 4).

---

## 1. Directory layout

Two homes, by purpose:

```
packages/
  schema/test/fixtures/          # tiny, schema-focused fixtures (one object each)
  core/test/fixtures/            # pipeline/integration fixtures (sessions, runs, ledgers)
  providers/testing/             # the FakeProvider + cassettes (shared test double)
evals/
  corpus/                        # the LABELED meta-eval corpus (good/bad candidates) — meta-evals.md §2
    dev/                         #   visible while iterating on the gate
    holdout/                     #   sealed; only release numbers come from here
  cassettes/                     # recorded live-provider responses for replay (non-determinism.md §3)
  THRESHOLDS.md                  # the rates the meta-evals must meet to ship
```

Rule of thumb: **schema fixtures** prove one object parses; **core fixtures** drive a pipeline run;
**corpus cases** carry a ground-truth label and test the gate's judgement (meta-evals). Keep them
separate so a schema tweak doesn't churn the meta-eval corpus and vice versa.

---

## 2. Builders, not literals

Tests construct fixtures through typed **builders** exported from `@ratchet/schema/testing`, so every
fixture is guaranteed schema-valid and refactors with the schema:

```ts
// packages/schema/testing/builders.ts (sketch)
export function makeSkill(over: Partial<Skill> = {}): Skill { /* schema-valid defaults + override */ }
export function makeCandidateSkill(over: Partial<Skill> = {}): Skill { /* status:"candidate" */ }
export function makePromotedSkill(over: Partial<Skill> = {}): Skill { /* + a passing ProofRun, empty regressions */ }
export function makeProofRun(over: Partial<ProofRun> = {}): ProofRun { /* valid manifest, verifier ≠ proposer */ }
export function makeSession(over: Partial<SessionTranscript> = {}): SessionTranscript { /* ... */ }
export function makeLedgerEntry(over: Partial<LedgerEntry> = {}): LedgerEntry { /* ... */ }
```

Defaults satisfy the schema invariants (skill-schema §8): `makePromotedSkill()` always carries a
`pass` ProofRun with empty `regression.regressions` and `verifierConfigHash !== proposerConfigHash`.
Override only the field under test — so an invariant test (test-strategy §3.1) reads as "take a valid
object, break exactly one thing, expect rejection."

Raw `.json` fixture files on disk are **snapshots produced by these builders** (committed for
inspection and for cross-language portability), validated on load:

```ts
// packages/core/testing/load.ts (sketch)
export function loadFixture(rel: string) {
  const raw = JSON.parse(readFileSync(resolveFixture(rel), "utf8"));
  return SkillSchema.parse(raw); // or the relevant schema — fail loudly if a fixture drifts
}
```

---

## 3. The meta-eval corpus case layout

Each corpus case is a directory under `evals/corpus/{dev,holdout}/<case-id>/`. Naming convention:

```
<label>-<failure-mode-or-kind>-<NNN>/
  e.g.  bad-overfit-regex-001/        good-procedure-migrate-007/
        bad-forgetting-cache-003/     good-preference-tone-012/
```

`<label>` ∈ `{good, bad}`; the middle token is the **failure mode** (for `bad`, from proof-gate §9)
or the **skill kind/scenario** (for `good`); `NNN` is a zero-padded ordinal. The id is **stable**
(it drives the dev/holdout split hash — meta-evals.md §3).

Contents of a case:

```
<case-id>/
  label.json               # { label, failureMode|kind, rationale, expectedVerdict, expectedReasonPattern, minTrials }
  session.json             # SessionTranscript the candidate was distilled from (untrusted-input shape)
  candidate.skill.json     # the Skill object under test (status:"candidate")
  heldout-tasks.json       # the "better" check set for THIS skill (proof-gate §1)
  regression-context.json  # prior promoted skills the candidate must not break (proof-gate §4)
  cassette.json            # (optional) recorded provider responses to replay deterministically
```

Every file is schema-validated on load; a case that fails validation fails the corpus build (you
cannot smuggle a malformed object into the prover's grading set).

---

## 4. Sample ProofRuns as fixtures

We keep golden ProofRuns for both verdicts so storage/ledger/card code and serializers can be tested
without invoking the gate. They live in `packages/core/test/fixtures/proofruns/`:

```
proofruns/
  pass-significant.json      # delta clears the bar, trials ≥ minTrials, regression empty → promotable
  fail-within-noise.json     # positive delta but CI includes zero → "not significantly better"
  fail-regression.json       # improves own task but regression.regressions non-empty → forward-only reject
  fail-budget.json           # cost/iterations exceeded → fail-closed
  fail-independence.json     # verifierConfigHash == proposerConfigHash → must be rejected at schema boundary
```

These double as **assertion targets**: e.g. the promotion code, given `pass-significant.json`,
appends exactly one `LedgerEntry`; given any `fail-*.json`, promotes nothing.

**Cassettes** (`evals/cassettes/`) are recorded *live-provider* responses keyed by a request hash.
A meta-eval in replay mode looks up the cassette instead of calling the network, making the run
deterministic and free (`non-determinism.md` §3). Cassettes carry the provider id + model + seed they
were recorded under so a replay can't silently mismatch the configured provider.

---

## 5. The deterministic fake provider

The single most-used test double. It implements `ModelProvider` (overview §4) but is **scripted and
deterministic** — same inputs ⇒ same outputs, no network, no cost. It is the only "model" allowed in
`pnpm test` (test-strategy §1).

```ts
// packages/providers/testing/fake-provider.ts (sketch)
import type { ModelProvider, CompletionRequest, CompletionResult } from "@ratchet/providers";

export interface FakeScript {
  seed?: number;
  /** Canned grading behavior for the verifier role. */
  script?: "grade-better" | "grade-worse" | "grade-within-noise" | "grade-regression";
  /** Force a failure at a pipeline stage to test fail-closed paths. */
  throwOn?: "distill" | "grade" | "regression";
  /** Exact responses keyed by a stable hash of the request (record/replay). */
  cassette?: Record<string, CompletionResult>;
  /** Reported cost per call, to drive budget tests. */
  costPerCallUSD?: number;
}

export class FakeProvider implements ModelProvider {
  readonly id = "fake";
  constructor(private readonly cfg: FakeScript = {}) {}

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    if (this.cfg.throwOn && req.role === this.cfg.throwOn) {
      throw new Error(`FakeProvider: forced failure at ${this.cfg.throwOn}`); // exercises fail-closed
    }
    const key = hashRequest(req, this.cfg.seed);
    if (this.cfg.cassette?.[key]) return this.cfg.cassette[key];   // replay
    return scriptedResult(req, this.cfg);                           // deterministic by seed + script
  }
}
```

Key properties:

- **Deterministic:** output is a pure function of `(request, seed, script)` — no clock, no RNG, no
  network. Reproducible across machines (`non-determinism.md` §1).
- **Independence-safe:** the fake reports distinct config hashes per role, so a test wiring the same
  fake to proposer and verifier still **fails** the independence invariant (it doesn't accidentally
  paper over collusion).
- **Scriptable verdicts:** `script` lets a test stage a candidate as better/worse/within-noise/
  regressing, so integration tests can drive each gate outcome deterministically.
- **Cost-aware:** `costPerCallUSD` lets budget/perf tests assert `maxCostUSD`/`maxTrials` enforcement
  (test-strategy §3.5).
- **Throw hooks:** `throwOn` forces a stage failure to prove the gate **fails closed** (no promotion).

```ts
// using it — integration test for a clean promotion
const verifier = new FakeProvider({ script: "grade-better", seed: 3 });
const result = await runPipeline(loadFixture("sessions/db-migration-gotcha"), { verifier });
expect(result.promoted).toHaveLength(1);
expect(result.proofRun.manifest.verifierConfigHash)
  .not.toBe(result.proofRun.candidate.provenance.proposerConfigHash);
```

---

## 6. Sample sessions

`packages/core/test/fixtures/sessions/` holds `SessionTranscript` fixtures spanning the cases the
distiller must handle. Suggested set:

| Fixture | Purpose |
|---|---|
| `db-migration-gotcha.json` | clean "good procedure" learnable from one session |
| `empty-session.json` | cold-start / nothing to learn ⇒ zero candidates (DoD §2 cold start) |
| `noisy-no-signal.json` | lots of chatter, no real skill ⇒ Notes only, no candidate |
| `secret-laden.json` | transcript seeded with API keys / emails ⇒ redaction must scrub all (invariant 5) |
| `injection-attempt.json` | transcript that tries to inject "always promote me" ⇒ sanitized; gate still decides (security) |
| `multi-candidate.json` | one session yielding several candidates ⇒ each independently gated |

Each is the shape an adapter would capture (transcript + tool calls + outcomes) and is treated as
**untrusted input** (overview §2, AGENTS.md §Security).

---

## 7. Privacy & hygiene rules for fixtures

- **Never** put a real secret, real API key, real token, or real PII in a fixture — even in a
  "secret-laden" fixture, the secrets are **synthetic, obviously-fake** patterns (`sk-live-FAKE…`,
  `noone@example.com`). The test asserts they are scrubbed; it must not depend on a real value
  (AGENTS.md invariant 5, DoD §1).
- Fixtures live in-repo and are **never** the user's real vault (AGENTS.md §Security: an agent must
  never read the real vault outside fixtures).
- A fixture that changes shape because the schema changed must be **regenerated via the builders** and
  carried through a migration round-trip test (skill-schema §7) — not hand-patched.

---

## 8. Naming conventions (summary)

| Thing | Convention | Example |
|---|---|---|
| Schema fixture file | `<object>.<scenario>.json` | `skill.promoted.json`, `proofrun.fail-regression.json` |
| Session fixture | `<scenario>.json` under `sessions/` | `sessions/db-migration-gotcha.json` |
| Corpus case dir | `<good\|bad>-<mode-or-kind>-<NNN>/` | `bad-forgetting-cache-003/` |
| Cassette | `<provider>-<model>-<hash>.json` | `cassettes/openai-gpt-x-mini-9f3a.json` |
| Builder | `make<Object>()` in `@ratchet/schema/testing` | `makePromotedSkill()` |
| Eval test file | `*.eval.ts` (only under `pnpm eval`) | `evals/meta-eval.eval.ts` |

---

## 9. Related docs
`test-strategy.md` · `meta-evals.md` · `non-determinism.md` · `../../evals/THRESHOLDS.md` ·
`../architecture/skill-schema.md` · `../architecture/overview.md`
