# ADR-0001: Record architecture decisions

- **Status:** Accepted
- **Date:** 2026-06-22
- **Deciders:** Ratchet maintainers

## Context

Ratchet is an open-source project with non-negotiable correctness invariants (AGENTS.md) and a
deliberately small, public API surface (CLI + MCP). Decisions that touch the proof gate, the schema,
or the vault substrate have long-lived consequences, and future contributors — plus future-us — need
to know *why* a choice was made, not just *what* the code does. The Inventory (B10) explicitly calls
for ADRs as an ongoing artifact: "short 'we chose X over Y because Z' notes."

Without a durable decision record, rationale lives only in PR threads and people's heads, which rots.
We want a lightweight, low-ceremony format that contributors will actually keep up to date (AGENTS.md
already mandates "docs are code" — updated in the same PR).

## Decision

We adopt **Architecture Decision Records** in the **Michael Nygard format** (Context / Decision /
Consequences, plus Status and Date). Conventions:

- ADRs live in `docs/architecture/adr/` as `NNNN-kebab-title.md`, numbered sequentially and never
  renumbered.
- **Status** is one of: `Proposed`, `Accepted`, `Superseded by ADR-XXXX`, `Deprecated`.
- ADRs are **immutable once Accepted**: to change a decision, write a new ADR that supersedes the old
  one (and mark the old one `Superseded by ADR-XXXX`). History is preserved, not edited.
- Any change that touches a non-negotiable invariant or the public API contract **must** ship with an
  ADR in the same PR (consistent with AGENTS.md §Commit & PR guidelines).
- ADRs are short — context, the decision, and its consequences (including the downsides we accept).

## Consequences

**Positive**
- Contributors can read the *why* behind the proof gate, the TS/Node stack, the markdown substrate,
  and the continual-harness dependency without archaeology.
- Superseding-not-editing keeps an honest trail of how the architecture evolved (mirrors the project's
  own "append-only ledger" ethos).
- Lowers the barrier to good contributions (Inventory F3): the design context is written down.

**Negative / costs**
- Small per-decision overhead. Mitigated by keeping ADRs short and only requiring them for
  architecturally significant or invariant-touching changes.
- Risk of ADRs going stale if not maintained. Mitigated by the "same-PR" rule and treating docs as
  code.

## Related
`0002-typescript-node-stack.md` · `0003-markdown-vault-substrate.md` ·
`0004-build-on-continual-harness.md` · `../overview.md` · `AGENTS.md`
