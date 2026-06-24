# Ratchet — Proof Gate Design (the heart of the product)

> ⭐ This is what makes Ratchet *Ratchet*. If the proof is weak, the product is a lie. Treat every rule here as a correctness requirement, not a guideline.

The proof gate decides: **does this candidate skill actually make the agent better, provably, without breaking anything it already knew?** Only a `pass` may promote (via `@ratchet/core/promotion`). It **fails closed**.

---

## 1. What "better" means (you must define it per skill)

"Better" is never assumed. For each candidate, the gate needs a **task set** and a **metric**:

- **Task set:** a small set of *held-out* checks representative of where the skill should apply. Sources (in priority): (a) user-provided acceptance checks, (b) tasks mined from real past sessions in the same scope, (c) synthesized tasks (lowest trust, flagged).
- **Metric:** how success is scored — deterministic (tests pass, output matches, schema valid) wherever possible; LLM-graded rubric only for genuinely subjective criteria, and then via an **independent** verifier.
- **Baseline:** the agent's current behavior *without* the candidate skill, on the same task set, same conditions.

A candidate that has no valid way to define "better" stays a **Note/draft** — it is not eligible for promotion.

## 2. Evaluator independence (anti-gaming)

- The model/config that **proposes/distills** a skill MUST NOT be the one that **grades** it. Enforced via `proposerConfigHash !== verifierConfigHash`.
- Prefer a **different provider/family** for the verifier to reduce correlated blind spots (see the "2 effective votes" problem).
- Optional **adversarial verifier ("prosecutor")**: a role explicitly tasked to argue the skill did *not* help and to find failure cases. Recommended for subjective skills. Records `dissent`.

## 3. Statistical validity (don't promote luck)

LLM outcomes are noisy. A single good run is not proof.

- **minTrials:** run baseline and candidate on the task set ≥ `minTrials` times (config; default ≥ 5, more for high-variance tasks).
- **Significance bar:** the candidate must beat baseline by a margin that clears a significance threshold (e.g., bootstrap confidence interval excludes zero, or a configured effect-size floor). Record `significance` in the ProofRun.
- **Tie/within-noise ⇒ fail.** No promotion when the delta is within measurement noise.

## 4. Regression suite (the "forward-only" guarantee)

- On every promotion attempt, re-run the candidate-augmented agent against the **regression set**: a maintained set of checks representing all currently-promoted skills (a "yardstick").
- **Any** regression (a previously-passing check now fails) ⇒ **fail**, even if the candidate improves its own task. Forward-only is non-negotiable.
- Keep a stable **benchmark yardstick** task set for the ledger's improvement curve (so the curve is comparable over time).

## 5. Leakage & overfitting guards

- The held-out task set must not be derivable from the candidate's own distillation trace (no training-on-the-test). Validate separation; flag synthesized tasks.
- Rotate / hold out a portion of tasks the candidate never "saw" during distillation.
- Split held-out checks into **exact** tasks (the direct proof prompt or acceptance check) and
  **adjacent/generalization** tasks (same scope, not distilled from or tuned to the exact trace).
- Promotion requires both aggregate lift and adjacent-task lift. The adjacent set must clear
  `proof.generalizationMinLift` (default `0.05`). If a skill only helps its exact proof task and has
  ~zero adjacent lift, it fails as teaching-to-the-test even when the aggregate effect size clears the
  significance bar.

## 6. Promotion algorithm (pseudocode)

```text
function evaluate(candidate, ctx):
    assert candidate.proposerConfigHash != ctx.verifier.configHash   # independence
    tasks = resolveHeldOutTasks(candidate, ctx)                      # fail if none valid
    if tasks invalid: return FAIL("no valid 'better' definition")

    baseline  = runTrials(agentWithout(candidate), tasks, n=minTrials)
    candidateR = runTrials(agentWith(candidate),   tasks, n=minTrials)
    if not significantlyBetter(candidateR, baseline, bar):
        return FAIL("not significantly better", dissent)
    if adjacentLift(candidateR, baseline) < config.proof.generalizationMinLift:
        return FAIL("does not generalize to adjacent held-out tasks")

    reg = runRegression(agentWith(candidate), regressionSet)
    if reg.hasRegressions():
        return FAIL("regresses prior skills", reg)

    if cost.exceeded() or iterations.exceeded():
        return FAIL("budget exceeded")            # fail closed

    return PASS(manifest, measurement, reg, confidence)
```

Promotion happens **only** on `PASS`, **only** through `@ratchet/core/promotion`, which writes the ledger entry and flips status to `promoted`.

## 7. Cost & loop control

- Hard limits from config: `maxTrials`, `maxCostUSD` per evaluation, `maxIterations` for any self-rewrite loop.
- **Tiered escalation:** cheap/small verifier first; escalate to a stronger/larger panel only on borderline or low-confidence results. Don't spend a full panel on obvious cases.
- Deterministic checks (tests/lint/schema) run before any model-graded check — they're free truth.

## 8. Staleness & re-validation

- Skills can expire (`trust.expiresAt`). On expiry or on detecting a context change (e.g., dependency/API drift), re-run the gate. Failing re-validation ⇒ `retired` (logged), never silently kept.

## 9. Failure modes this design defends against (traceability)

| Failure (from research) | Defense here |
|---|---|
| Self-delusion ("faithful self-evolvers") | Independent verifier + statistical bar |
| Noise-as-signal | minTrials + significance |
| Catastrophic forgetting | Regression suite, fail-closed |
| Correlated judges ("2 effective votes") | Provider diversity + adversarial verifier |
| Teaching-to-the-test | Leakage guard + adjacency check |
| Cost blow-up / runaway loops | Budgets + tiered escalation |
| Memory poisoning | Untrusted-input sanitization + gate as defense (`security/threat-model.md`) |

## 10. How we test the gate itself

See `docs/testing/meta-evals.md`: a labeled set of known-good and known-bad candidate skills; the gate must promote the good and reject the bad within target false-promote/false-reject rates. **A learning feature is not "done" until this passes** (`definition-of-done.md` §3).
