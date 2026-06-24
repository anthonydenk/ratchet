# Ratchet — Meta-Eval Thresholds (the bar to ship the prover)

**Status:** Draft v0.1 · The single source of truth for the numbers `pnpm eval` enforces.
Referenced by `../AGENTS.md` (§Test commands), `../docs/product/definition-of-done.md` (§3), and
`../docs/testing/meta-evals.md`.

> These are the concrete gates a learning feature must clear before it is **done** and before a
> release can ship. They describe how well the **proof gate itself** must classify candidate skills,
> measured over the labeled meta-eval corpus (`../docs/testing/meta-evals.md`). If `pnpm eval` reports
> any metric outside its bound, it **exits non-zero** and the learning-path PR / release is **blocked**
> (fail-closed, like the gate it tests). Numbers here are a **machine-readable contract**; the runtime
> mirror is `evals/thresholds.ts`, and the two must agree (a test asserts it).

---

## 1. The gating thresholds (v0.1)

| Key | Value | Meaning | Gate |
|---|---|---|---|
| `maxFalsePromoteRate` | **0.02** | ≤ 2% of **bad** candidates may be promoted (measured on the holdout slice) | **HARD** — release-blocking |
| `maxFalseRejectRate` | **0.20** | ≤ 20% of **good** candidates may be rejected | **HARD** — release-blocking |
| `minCases` | **60** | minimum labeled cases scored (≈ balanced good/bad) before a result is shippable | **HARD** |
| `minTrialsPerCase` | **5** | trials per case; must be ≥ `proof.minTrials` (proof-gate §3) | **HARD** |
| `fprConfidence` | **0.95** | we gate on the **upper 95% CI bound** of FPR, not the point estimate | **HARD** |
| `minProvideDiversityGap` | **> 0** | FPR with provider diversity must be strictly lower than without (independence is load-bearing — meta-evals §4) | **HARD** |

Plus these **non-rate hard gates** (any one failing fails the whole run, regardless of FPR/FRR):

- **Evaluator independence:** every emitted ProofRun has
  `verifierConfigHash !== proposerConfigHash` (AGENTS.md invariant 2; skill-schema §8.1).
- **Regression fail-closed:** no candidate is promoted when the regression suite could not run
  (proof-gate §6; meta-evals §5).
- **No imported auto-promote:** no `quarantined`/imported skill is promoted without a local
  re-verification ProofRun (skill-schema §8.5).
- **Manifest completeness:** every result carries a full determinism receipt
  (AGENTS.md invariant 7; non-determinism §7).

---

## 2. Rationale (why these numbers, and why asymmetric)

**Why FPR ≪ FRR.** A false-**promote** is the catastrophic error: a bad skill, once promoted, is
injected into *every future session* and silently degrades the agent — the exact failure the product
exists to prevent. A false-**reject** is merely lost learning: the candidate stays a `candidate`/draft
and can be re-proposed later. Consistent with the gate's fail-closed stance (proof-gate §6), we hold
FPR an order of magnitude tighter than FRR. **2% vs 20% is deliberate, not a typo.**

**Why gate on the CI bound, not the point estimate.** With ~60–100 cases, an observed FPR of 0 could
still hide a true rate above the ceiling. Gating on the **upper 95% bound** means a small, lucky
sample can't ship a leaky gate — the same logic by which the gate refuses to promote on one good run
(proof-gate §3; non-determinism §5).

**Why `minCases` / `minTrialsPerCase` floors.** A great-looking rate over 8 cases is noise. We refuse
to ship on an under-powered measurement; the floors make the rate statistically meaningful and keep
`minTrialsPerCase` aligned with the gate's own `minTrials`.

**Why the provider-diversity gap gate.** If FPR is identical with and without verifier diversity, the
"2 effective votes" defense (proof-gate §2) isn't actually doing work — independence has silently
regressed. Requiring a strictly positive gap turns that defense into a *measured* property, not an
assumed one.

---

## 3. Machine-readable mirror

`evals/thresholds.ts` is imported by the eval harness; it must equal the table above (asserted in a
test so the doc and the code can't drift):

```ts
// evals/thresholds.ts
export const THRESHOLDS = {
  maxFalsePromoteRate: 0.02,   // ≤ 2% bad promoted  (HARD)
  maxFalseRejectRate:  0.20,   // ≤ 20% good rejected (HARD)
  minCases:            60,     // min labeled cases scored
  minTrialsPerCase:    5,      // ≥ proof.minTrials
  fprConfidence:       0.95,   // gate on upper CI bound of FPR
  minProviderDiversityGap: 0,  // FPR(diverse) must be < FPR(colluding)
} as const;
```

A `pnpm eval` run computes `falsePromoteRate`, `fprUpperCI95`, `falseRejectRate`, `cases`, `trials`,
and the diversity gap, then checks each against the above. Example gating assertion in
`../docs/testing/meta-evals.md` §8.

---

## 4. What "pass" looks like (a release receipt)

```
$ pnpm eval
meta-eval (holdout) · corpus v0.1 (split 9f3a…) · gate config a1b2…
  cases scored ............ 72            (≥ 60)      ✓
  trials/case ............. 5             (≥ 5)       ✓
  false-promote rate ...... 0.000  (CI95 ≤ 0.018)    ✓   (≤ 0.02)
  false-reject rate ....... 0.139                    ✓   (≤ 0.20)
  diversity FPR gap ....... +0.06                    ✓   (> 0)
  independence violations . 0                        ✓
  regression fail-closed .. 0 leaks                  ✓
PASS — within evals/THRESHOLDS.md
```

A single ✗ anywhere ⇒ non-zero exit ⇒ the learning-path PR / release is blocked
(definition-of-done §3, §6).

---

## 5. Tighten over time (ratchet the bar down, never up)

These are **ceilings that only ratchet down** — the same forward-only philosophy as the product
itself. As the corpus grows and the gate improves, lower `maxFalsePromoteRate` **first** (e.g.
0.02 → 0.01 → 0.005). Loosening **any** threshold is a deliberate trust regression and requires an
ADR (`../docs/architecture/adr/`) stating why, plus explicit sign-off — because relaxing the prover's
bar is relaxing the only promise Ratchet makes. Changes to this file are reviewed as carefully as a
schema change.

Planned trajectory (illustrative, not binding):

| Milestone | `maxFalsePromoteRate` | `maxFalseRejectRate` | `minCases` |
|---|---|---|---|
| v0.1 (now) | 0.02 | 0.20 | 60 |
| v0.2 | 0.01 | 0.15 | 120 |
| v1.0 | 0.005 | 0.10 | 250 |

---

## 6. Related docs
`../docs/testing/meta-evals.md` · `../docs/testing/test-strategy.md` · `../docs/testing/fixtures.md` ·
`../docs/testing/non-determinism.md` · `../docs/architecture/proof-gate.md` ·
`../docs/product/definition-of-done.md` · `../AGENTS.md`
