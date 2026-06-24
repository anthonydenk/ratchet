# Ratchet — AI-Specific Considerations (the hard problems that decide if it works)

**Status:** Draft v0.1 · Read `proof-gate.md`, `skill-schema.md`, and `../security/threat-model.md` first.

> ⭐ This is the deep treatment of **Section C of the Project Artifact Inventory** — the AI-specific
> problems that "have almost no overlap with normal software and are where this product lives or
> dies." Each problem below is treated in four parts: **the problem**, **why it's hard**, **Ratchet's
> approach**, and **how it's tested**. Everything here is downstream of two non-negotiables: the
> **proof gate** is the only path into the active skill set (AGENTS.md invariant 1), and a learning
> feature is **not done until its meta-eval passes** (AGENTS.md §Test commands; `proof-gate.md` §10).

The single most important test for *all* of these is the **meta-eval**: a labeled set of known-good and
known-bad candidate skills against which we measure the gate's false-promote / false-reject rates
(Inventory D4; `proof-gate.md` §10; `docs/testing/meta-evals.md`). Where a section says "tested via
meta-eval," that is the load-bearing test.

```
            ┌──────────────────────── the gate is the spine ───────────────────────┐
 capture ──▶ distill (C8 signal/noise, C9 sanitize) ──▶ PROVE ─────────────────────▶ promote ──▶ ledger
            (untrusted, C9)        │  define "better" (C1), trials+significance (C2),  │  (C12 observability)
                                   │  independence (C3), regression (C4), leakage (C5),│
                                   │  conflicts (C6), staleness (C7), budgets (C11)    │
                                   └────────────────────────────────────────────────┘
```

---

## C1 — Defining "better" rigorously

**The problem.** A promotion claim is only as good as the held-out task that "proved" it. If the task
isn't representative of where the skill should apply, you prove nonsense. Eval design *is* the product.

**Why it's hard.** "Better" is per-skill and often subjective; a single benchmark can't cover all skill
kinds (preference vs. procedure vs. fact). It's tempting to grade with a vague rubric and call it
proof.

**Ratchet's approach.** Per `proof-gate.md` §1, every candidate must come with a **task set** and a
**metric** before it is eligible:
- Task-set sources, in trust order: (a) user-provided acceptance checks, (b) tasks mined from real past
  sessions in the same scope, (c) synthesized tasks (lowest trust, flagged in the ProofRun).
- Metric prefers **deterministic** signals (tests pass, output matches, schema valid); LLM-graded
  rubrics only for genuinely subjective criteria, and then via an **independent** verifier (→ C3).
- A candidate with **no valid way to define "better" stays a Note/draft** — never promoted. This is a
  fail-closed default, not a degraded promotion.
- `ProofRun.measurement.metric` records exactly what "better" meant for that skill, so it's auditable.

**How it's tested.** Meta-eval: candidates whose "better" is ill-defined must be **rejected** (or held
as drafts), and the false-promote rate on ill-defined candidates must stay within
`evals/THRESHOLDS.md`. Golden fixtures include known-bad task/metric pairings.

---

## C2 — Statistical validity (don't promote luck)

**The problem.** LLM outputs are noisy; a single good run is not evidence. Promote on one lucky sample
and the ledger fills with flukes.

**Why it's hard.** Variance is large and task-dependent; "how many trials is enough" has no universal
answer, and more trials cost money (→ C11).

**Ratchet's approach.** Per `proof-gate.md` §3 and `config-schema.md` (`proof.*`, `budgets.*`):
- Run baseline and candidate ≥ `minTrials` times (default ≥ 5, more for high-variance tasks).
- A **significance bar**: the candidate must beat baseline by a margin that clears a configured test —
  default `bootstrap-ci` whose CI on (candidate − baseline) **excludes zero** at `alpha`, optionally
  plus an effect-size floor (`minEffect`).
- **Tie or within-noise ⇒ fail.** `significance` is recorded in `ProofRun.measurement`.
- Cross-field guard: `minTrials ≤ maxTrials` so the bar is reachable within budget.

**How it's tested.** Meta-eval includes "lucky once" candidates (real delta ≈ 0 with one good sample);
the gate must **not** promote them. Property tests over synthetic score distributions confirm the
significance computation rejects within-noise deltas and the bootstrap CI behaves correctly. Mocked
model scores let this run under `pnpm test`; live variance is exercised under `pnpm eval`.

---

## C3 — Evaluator independence (anti-gaming)

**The problem.** If the thing that *proposes* a skill is the thing that *grades* it, the agent games
its own proof ("faithful self-evolver" delusion — PRD §1).

**Why it's hard.** It's easy to accidentally collapse roles (same model/config), and even different
models from the same family share correlated blind spots — the "2 effective votes" problem.

**Ratchet's approach.** This is **AGENTS.md invariant 2** and `proof-gate.md` §2, enforced in schema
and config:
- `proofs[].manifest.verifierConfigHash !== provenance.proposerConfigHash` (schema invariant,
  `skill-schema.md` §8). The config `.refine` rejects identical proposer/verifier config at load
  (`config-schema.md` §2); violation exits `3`.
- **Prefer a different provider/family** for the verifier to break correlated blind spots.
- Optional **adversarial verifier ("prosecutor")**: a role tasked to argue the skill did *not* help and
  find failure cases; records `dissent` in the ProofRun. Recommended for subjective skills.
- `ratchet doctor` has a dedicated `independence` check (`cli-mcp-interface.md` §6).

**How it's tested.** Unit tests assert the schema/config refuse equal proposer/verifier hashes
(exit `3`). Meta-eval runs candidates designed to "flatter the proposer"; an independent verifier must
catch them where a self-grader would not. `doctor --check independence` is part of CI smoke.

---

## C4 — Catastrophic forgetting / regression suite

**The problem.** New learning can silently break old skills. The "forward-only ratchet" promise is a
lie without a real re-test of everything previously earned.

**Why it's hard.** Skills interact; a change that helps task A can quietly degrade task B. You have to
re-test *all* prior skills on every promotion, affordably.

**Ratchet's approach.** **AGENTS.md invariant 3** + `proof-gate.md` §4:
- On every promotion attempt, run the candidate-augmented agent against the **regression set** — a
  maintained set of checks representing all currently-promoted skills.
- **Any** regression (a previously-passing check now fails) ⇒ **fail**, even if the candidate improves
  its own task. `ProofRun.regression.regressions` must be **empty** to pass (`skill-schema.md` §4).
- **If the regression suite can't run, promotion fails closed** (invariant 3) — never an optimistic
  promote.
- A separate stable **yardstick** powers the ledger curve so progress is comparable over time
  (`ledger-and-card.md` §2); the yardstick is distinct from the per-skill regression checks.

**How it's tested.** This is the marquee meta-eval: a candidate that improves its own task but breaks a
prior skill must be **rejected** with the regression recorded. Integration tests run the pipeline on
fixtures with known skill interactions. A "regression suite unavailable" fault-injection test asserts
fail-closed behavior (exit `6`).

---

## C5 — Test-set leakage / overfitting the gate

**The problem.** If a skill is tuned to its exact proof task, you get a "paper-trained" agent — great on
the test, useless in the wild.

**Why it's hard.** The distiller sees the session that produced the candidate; it's easy for the proof
task to be derivable from that same trace, so the candidate "passes" by memorization.

**Ratchet's approach.** Per `proof-gate.md` §5:
- The held-out task set **must not be derivable** from the candidate's own distillation trace; Ratchet
  validates separation and flags synthesized tasks.
- **Rotate / hold out** a portion of tasks the candidate never "saw" during distillation.
- **Adjacency check:** if a skill only helps its exact proof task and nothing adjacent, its
  `trust.confidence` is lowered (teaching-to-the-test signal).

**How it's tested.** Meta-eval includes overfit candidates (helps the exact proof task only). The gate
must either reject them or assign low confidence; the false-promote rate on overfit candidates is a
tracked threshold. Leakage-detection unit tests confirm task↔trace separation logic.

---

## C6 — Skill conflict resolution

**The problem.** Two earned skills contradict each other (e.g., "always use tabs" vs. "always use
spaces"). Which wins, and how is the conflict even detected?

**Why it's hard.** Contradictions can be semantic, not lexical; and a new skill can conflict with an old
one that's still actively trusted.

**Ratchet's approach.** The schema carries `conflictsWith?: string[]` and lineage `supersedes`
(`skill-schema.md` §2):
- At distillation/promotion, candidates are checked against promoted skills in overlapping
  `applicability.scope`; detected contradictions populate `conflictsWith`.
- Resolution is **gate-mediated, not first-come**: a conflicting candidate must beat the incumbent
  *and* pass regression. If it wins cleanly, it `supersedes` the prior skill (lineage recorded, old one
  retired in the ledger). If it can't, it stays a candidate and the conflict is surfaced.
- Unresolved live conflicts can mark a skill `quarantined` until adjudicated — never silently
  both-active.

**How it's tested.** Meta-eval pairs of contradictory candidates: the gate must detect the conflict and
resolve it deterministically (one supersedes via proof, or both held). Unit tests cover
`conflictsWith` detection and the `supersedes` lineage write. Ledger shows the retirement of the
superseded skill (C12).

---

## C7 — Skill staleness / decay

**The problem.** A skill that was true (an API shape, a preference, a dependency version) stops being
true. Stale skills quietly mislead the agent.

**Why it's hard.** Knowing *when* something went stale is itself hard; facts decay faster than
preferences, and external drift (an API change) has no local signal unless you look.

**Ratchet's approach.** Per `proof-gate.md` §8 and `config-schema.md` (`expiry.*`):
- Skills carry `trust.expiresAt`; `expiry.defaultDays` plus per-kind overrides (e.g. `fact: 30`,
  `preference: 365`) set the cadence.
- On expiry — or on detected **drift signals** (dependency/API change) when
  `revalidateOnDriftSignals` is on — the gate re-runs (`ratchet verify --revalidate`).
- **Failing re-validation ⇒ `retired`** (logged in the ledger), never silently kept. The curve honestly
  reflects retirements (`ledger-and-card.md` §2).

**How it's tested.** Meta-eval with "was-true-now-false" skills: re-validation must retire them.
Time-travel unit tests (mock the clock) assert expiry triggers re-validation; drift-signal fixtures
assert early re-validation. Ledger integration test confirms a `retired` event is appended.

---

## C8 — Distillation: signal vs. noise

**The problem.** Most of a conversation is junk — chit-chat, dead ends, abandoned attempts. The gold
(a real, reusable lesson) is rare. Keep the noise and you flood the gate with garbage candidates.

**Why it's hard.** Distinguishing a durable lesson from a one-off requires judgment; the distiller is
itself an LLM and can hallucinate "lessons."

**Ratchet's approach.** Distillation (`overview.md` §2) is LLM-assisted **plus rules**, schema-validated
and sanitized:
- Produce compact, human-readable **Notes**; only a subset become **candidate Skills**. A Note is not a
  promotion (`note-format.md` §2).
- Candidates are validated against the `Skill` schema at the boundary — no raw LLM JSON trusted
  (AGENTS.md §Code style).
- The **gate is the real filter**: even a plausible-looking distilled "lesson" must beat baseline with
  significance and pass regression. Distillation only has to surface *candidates*; the gate decides
  truth. This keeps the distiller's job (recall) separate from the gate's job (precision).
- Low-value or unredactable content is dropped, not stored (→ C9; `note-format.md` §7).

**How it's tested.** Golden fixtures of noisy sessions with labeled "should-yield" lessons: measure
distillation recall (did it surface the real lesson?) without requiring precision (the gate handles
that). Property/fuzz tests feed arbitrary human conversation so weird input can't crash or poison the
distiller (Inventory D7). Meta-eval confirms hallucinated "lessons" from junk sessions fail the gate.

---

## C9 — Memory poisoning / prompt injection

**The problem.** A malicious conversation can plant a bad "lesson" — a named OWASP Agentic risk. A
self-learning agent that ingests untrusted text is an attack surface (AGENTS.md §Security).

**Why it's hard.** The captured session is **untrusted input by definition** (`overview.md` §2), and
injection can be subtle (instructions disguised as content, attempts to exfiltrate secrets or to plant
a self-serving skill).

**Ratchet's approach.** Defense in depth — *the proof gate is a defense, not a formality*
(`proof-gate.md` §9; `../security/threat-model.md`):
- **Treat every captured conversation as untrusted.** Distillation **sanitizes** and redacts; secrets/
  PII never reach the vault, ledger, or logs (AGENTS.md invariant 5; `note-format.md` §7).
- A poisoned candidate still has to **beat baseline on held-out tasks and pass regression** with an
  **independent** verifier (C3) — a planted "lesson" that doesn't actually help cannot promote.
- Imported skills (v3) are **`quarantined`** until proof + provenance + signature are re-verified
  locally; never auto-promoted (`skill-schema.md` §6, §8; AGENTS.md §Security).
- Suspicious candidates can be `quarantined` for human review (C12 observability).

**How it's tested.** Meta-eval includes adversarial/poisoned sessions (injection payloads, self-serving
"always run this command" lessons); the gate + sanitizer must reject/quarantine them, with false-promote
on poisoned candidates held at/near zero in `evals/THRESHOLDS.md`. Fuzz tests (C8) double as
injection-robustness tests. Redaction unit tests assert no secret/PII leaks to any artifact.
Cross-referenced to `../security/threat-model.md`.

---

## C10 — Cold start

**The problem.** Behavior with **zero skills**. First run must feel magical, not empty — or the vibe
coder churns before activation (PRD §3, §7).

**Why it's hard.** There's no ledger, no curve, nothing earned yet; and you can't fake progress without
breaking the proof promise.

**Ratchet's approach.**
- **v0 distill-only path** gives immediate value: even with no verifier configured, Ratchet produces
  clean, readable **Notes** in the vault on the first session (`config-schema.md` §5). The user sees
  their agent's knowledge captured right away — the v0 "this alone is useful" hook (PRD §6).
- `ratchet doctor` tells the user exactly what to configure (a verifier ≠ proposer) to **unlock the
  proof gate** — a guided path from "notes" to "earned skills."
- The cold-start ledger/card honestly shows "Level 0 / 0 skills earned" and the curve starts at the
  cold-start baseline (`ledger-and-card.md` §2) — the *first* promotion is the magic moment, and it's
  real.
- No synthetic/fake skills are ever seeded to fake progress (would violate the proof promise).

**How it's tested.** Integration test of a fresh `ratchet init` → first session → Notes appear, no
promotions, `doctor` reports the missing verifier. Activation is a tracked North-Star-adjacent metric
(% earning a first proven skill within 24h, PRD §7).

---

## C11 — Runaway cost / loop guards

**The problem.** Verification is N model calls; self-rewriting (v2) can loop indefinitely. Without hard
caps, a single cycle can burn unbounded money or never terminate.

**Why it's hard.** Tiered verification and adversarial panels multiply calls; self-rewrite loops are
recursive by nature.

**Ratchet's approach.** **AGENTS.md invariant 6** — mandatory, enforced in `core`:
- Hard limits from config: `maxTrials`, `maxCostUSD` (per evaluation), `maxIterations` (self-rewrite),
  and `maxCostUSDPerRun` (per invocation) (`config-schema.md` §2). **No unbounded loops, ever.**
- **Tiered escalation** (`proof-gate.md` §7): cheap/small verifier first; escalate to a stronger/larger
  panel only on borderline/low-confidence results. Deterministic checks (tests/lint/schema) run first —
  they're free truth.
- Hitting any budget **fails closed** (exit `7` / `BUDGET_EXCEEDED`), never an optimistic promote.
- CLI flags (`--max-cost-usd`, `--max-trials`, `--max-iterations`) and MCP budget errors expose the
  caps at every surface (`cli-mcp-interface.md`).

**How it's tested.** Unit tests assert loops terminate at `maxIterations` and evaluations stop at
`maxTrials`/`maxCostUSD`, failing closed (exit `7`). Cost-accounting tests verify `ProofRun.costUSD`
tracks spend. Performance/cost tests (Inventory D8) keep per-cycle latency + dollars within budget.
Fault-injection: a verifier that always returns "borderline" must still terminate under the caps.

---

## C12 — Learning-process observability

**The problem.** Users must see **why** a skill was promoted or rejected, or they won't trust it
(Inventory C12). Opaque self-improvement is exactly what the market distrusts.

**Why it's hard.** The decision involves trials, significance, regression, dissent, and budgets — a lot
to surface without overwhelming the vibe coder while satisfying the researcher.

**Ratchet's approach.** Every decision leaves a **receipt**:
- Every `ProofRun` records a **manifest** (model id, seed, configHash, datasetId) + `measurement`
  (baseline/candidate scores, delta, trials, significance, metric) + `regression` + optional `dissent`
  (AGENTS.md invariant 7; `skill-schema.md` §4). **No improvement is ever reported without a
  manifest.**
- The vault's **skill mirror** shows the deciding proof and headline numbers in human-readable markdown
  (`note-format.md` §4); the **ledger** is append-only and every card claim links a re-verifiable
  receipt id (`ledger-and-card.md` §3).
- CLI: `ratchet ledger show <skillId>` surfaces the full receipt; `ratchet verify --explain` prints the
  reasoning trace for pass/fail (`cli-mcp-interface.md` §4–5).
- Rejections are explained too: `dissent` records the strongest objection / why it failed.

**How it's tested.** Snapshot/contract tests assert every promotion writes a manifest-backed ledger
entry and that `ledger show` / `--explain` expose it. A test asserts the pipeline **refuses** to report
improvement without a manifest. Dogfooding (Inventory D9) — running Ratchet on Ratchet's own
development — is the live observability check.

---

## Traceability summary

| C# | Problem | Primary defense | Canonical refs | Load-bearing test |
|---|---|---|---|---|
| C1 | Defining "better" | per-skill task set + metric; fail-closed to draft | proof-gate §1 | meta-eval (false-promote on ill-defined) |
| C2 | Statistical validity | minTrials + significance bar; tie⇒fail | proof-gate §3; config `proof` | meta-eval "lucky once" + property tests |
| C3 | Evaluator independence | proposer ≠ verifier (+prosecutor) | invariant 2; proof-gate §2; schema §8 | independence unit + meta-eval |
| C4 | Catastrophic forgetting | regression suite; any regression⇒fail-closed | invariant 3; proof-gate §4 | regression meta-eval + fault inject |
| C5 | Leakage / overfitting | task↔trace separation; adjacency confidence | proof-gate §5 | overfit meta-eval |
| C6 | Skill conflict | `conflictsWith` + `supersedes` via gate | schema §2 | contradictory-pair meta-eval |
| C7 | Staleness / decay | `expiresAt` + drift re-validation; fail⇒retire | proof-gate §8; config `expiry` | clock-mock + drift fixtures |
| C8 | Signal vs. noise | Notes vs. candidates; gate is the filter | overview §2; note-format §2 | recall fixtures + fuzz |
| C9 | Poisoning / injection | untrusted input + sanitize + gate-as-defense | invariant 5; proof-gate §9; threat-model | adversarial meta-eval + redaction tests |
| C10 | Cold start | distill-only value; doctor guidance; honest L0 | config §5; PRD §6 | fresh-init integration; activation metric |
| C11 | Runaway cost / loops | maxTrials/maxCostUSD/maxIterations; tiered; fail-closed | invariant 6; proof-gate §7; config | termination + cost unit tests |
| C12 | Observability | manifests + ledger + mirror + `--explain` | invariant 7; schema §4; ledger-and-card | manifest-required + snapshot tests; dogfood |

## Related docs
`proof-gate.md` · `skill-schema.md` · `overview.md` · `config-schema.md` · `cli-mcp-interface.md` ·
`note-format.md` · `ledger-and-card.md` · `../security/threat-model.md` · `../testing/meta-evals.md` ·
`adr/0004-build-on-continual-harness.md`
