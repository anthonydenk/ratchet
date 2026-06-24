# Ratchet Meta-Evals

Read [docs/architecture/proof-gate.md](../architecture/proof-gate.md) first. This document explains how `pnpm eval` tests the prover itself.

Ratchet's value proposition is proof. Unit tests can show that the machinery runs; meta-evals show whether the proof gate classifies candidate skills correctly.

## Core Idea

The proof gate is treated as a classifier:

- `good` candidates should be promoted;
- `bad` candidates should be rejected.

`pnpm eval` runs the real proof gate over a labeled corpus and reports:

- false-promote rate: bad candidates promoted;
- false-reject rate: good candidates rejected;
- false-promote upper 95% confidence bound;
- provider-diversity gap;
- evaluator-independence violations;
- regression fail-closed leaks.

The gates are defined in [evals/THRESHOLDS.md](../../evals/THRESHOLDS.md).

## Corpus

The deterministic holdout corpus lives in [evals/corpus/holdout.ts](../../evals/corpus/holdout.ts). It uses a fake deterministic evaluator so `pnpm eval` is repeatable, offline, and free.

Bad cases target the proof-gate failure modes:

- self-delusion or proposer optimism;
- noise-as-signal and lucky flukes;
- catastrophic forgetting/regression of earned skills;
- correlated judges and provider-family collusion;
- teaching-to-the-test and exact-task overfit;
- cost or iteration budget exhaustion;
- memory poisoning/prompt injection;
- regression suite unavailable, which must fail closed.

Good cases cover the supported skill kinds and task sources, including real-but-borderline improvements that should still pass when they generalize.

## Leakage Discipline

Meta-evals must not reward training on the test. Cases distinguish exact proof tasks from adjacent/generalization tasks. A candidate that wins only on the exact task but has no adjacent lift is bad and must be rejected.

The proof gate enforces this through `proof.generalizationMinLift`. The corpus includes permanent bad exact-task-overfit cases so this failure mode cannot silently return.

## Evaluator Independence

Evaluator independence is a hard gate. Every emitted ProofRun must have:

```text
verifierConfigHash != proposerConfigHash
```

The harness also compares a diverse-verifier run to a same-family/colluding run. The false-promote rate with diversity must be lower than the colluding run.

## Regression Fail-Closed

The regression suite protects earned skills. Meta-evals assert:

- a candidate that improves its own task but regresses an earned skill is rejected;
- a candidate is rejected when the regression suite cannot run;
- no uncertain regression state can promote.

## Commands

```bash
pnpm eval       # deterministic fake-provider meta-evals
pnpm eval:live  # optional real-model subset, loads keys from .env
```

`pnpm test` must not make live model calls. Live-model checks stay in `*.live.eval.ts` and write local reports under ignored `evals/reports/`.

## Pass Criteria

`pnpm eval` passes only when:

- case and trial floors meet [evals/THRESHOLDS.md](../../evals/THRESHOLDS.md);
- false-promote CI95 upper bound is at or below threshold;
- false-reject rate is at or below threshold;
- provider-diversity gap is positive;
- evaluator independence has zero violations;
- regression fail-closed has zero leaks;
- every ProofRun has a complete manifest.

A learning-path change touching distillation, proof, regression, promotion, or ledger behavior is not done until this passes.
