# Changelog

All notable changes to Ratchet are documented here.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

> **Schema rule:** any change to a `@ratchet/schema` object (Skill, Note, ProofRun,
> Ledger) requires **at least a minor version bump** and a migration in
> `packages/schema/migrations/`. Skill portability is a v3 promise — never break it silently.

## [Unreleased]

### Added (planned for v0 — "the hook")
- `ratchet init` / `ratchet watch` / `ratchet ledger` CLI commands.
- Session capture adapter for the first supported host agent.
- Distillation: sessions → clean, human-readable Notes in a user-owned markdown vault.
- `@ratchet/schema` definitions for Note and Skill (Zod, source of truth).
- `@ratchet/schema` definitions for full ProofRun receipts and LedgerEntry records
  (`schemaVersion` 0.2.0) with a 0.1.0 → 0.2.0 migration stub.
- Proof-gate evaluator enforcing held-out task resolution, minimum trials, significance,
  evaluator independence, regression fail-closed behavior, and cost/loop guards.
- Proof-gate generalization floor (`proof.generalizationMinLift`, default `0.05`) requiring
  adjacent-task lift so exact-proof-task overfits cannot promote on aggregate score alone.
- Promotion module as the only core path that flips a Skill to `promoted`, backed by a
  passing ProofRun and a ledger entry.
- Deterministic `pnpm eval` meta-eval harness with a labeled holdout corpus and
  `evals/thresholds.ts` mirror of `evals/THRESHOLDS.md`.
- End-to-end learning loop in `@ratchet/core`: transcript distillation, candidate Skill
  extraction, proof gate execution, promotion through `@ratchet/core/promotion`, and append-only
  ledger writes.
- Offline deterministic `ratchet demo` path that earns the same proof-backed skill without live
  model calls.
- `ratchet ledger` earned-skill view with proof delta, verdict, confidence, and curve output.
- `ratchet ledger --card` SVG/Markdown level-up card rendering from ledger + ProofRun receipts.

### Changed
- Pruned the public documentation set to the minimum needed for developers to build, test,
  understand the proof gate, and run the demo.

---

## [0.0.0] — Unreleased
- Project scaffolding, documentation suite, and `AGENTS.md` invariants established.

[Unreleased]: https://github.com/anthonydenk/ratchet/compare/v0.0.0...HEAD
