# Governance

Ratchet is young. This document keeps governance light but explicit, and lays a
path to "open and independent" as the project grows.

## Current model: BDFL-for-now

The project is currently led by its creator and maintainer, **Anthony Denkinger
([@anthonydenk](https://github.com/anthonydenk))**, who has final say on
direction, scope, and merges. This is appropriate for an early project and is
not meant to be permanent.

## How decisions are made

- **Everyday changes** — proposed via PR, reviewed against the
  [Definition of Done](docs/product/definition-of-done.md), merged by a maintainer.
- **Significant or architectural decisions** — captured as an
  [ADR](docs/architecture/adr/) (Architecture Decision Record). Discuss in an
  issue first; record the decision, context, and consequences.
- **Anything touching an [`AGENTS.md`](AGENTS.md) invariant** (the proof gate,
  evaluator independence, fail-closed, schema-as-canon) — requires explicit
  maintainer sign-off and an ADR. These are trust guarantees, not preferences.

## Principles

- **Proof over hype.** Features that weaken verification do not ship, however cool.
- **Open and independent.** The goal is a project that outlives any single
  employer or sponsor. Decisions are made in the open.
- **Beginner-friendly.** Lowering the barrier for non-traditional builders is a
  first-class goal, not an afterthought.

## Becoming a maintainer

Sustained, high-quality contributions (code, docs, evals, triage, community
help) earn trust. Maintainers are invited by existing maintainers based on track
record and shared judgment about the project's principles — especially a serious
respect for the verification invariants. Maintainer expectations: review PRs
fairly, uphold the Definition of Done, mentor newcomers, and act in the
project's long-term interest.

## Changing this document

Governance changes are themselves significant decisions: propose via issue,
record via ADR, and require maintainer consensus.
