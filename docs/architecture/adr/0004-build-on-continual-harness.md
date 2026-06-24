# ADR-0004: Build on / interoperate with continual-harness for self-rewriting

- **Status:** Proposed (pending license-compatibility confirmation)
- **Date:** 2026-06-22
- **Deciders:** Ratchet maintainers
- **Supersedes:** —

## Context

Ratchet's v2 theme is **continual self-rewriting, all proof-gated** (PRD §6): the agent refines its own
skills unattended, but every change still passes the gate. The mechanism for *how an agent rewrites
itself* — the self-improvement loop — is hard, well-studied work that we should not reinvent if a
solid, compatible implementation exists.

`continual-harness` (Karten et al., arXiv 2605.09998; `github.com/sethkarten/continual-harness`) is an
existing harness for the self-rewriting mechanism, already referenced in the PRD (§10) and Inventory
(I1). Reusing it could save substantial effort and align Ratchet with peer-reviewed methodology.

Two hard constraints frame this decision:
1. **License compatibility must be confirmed.** Inventory I1 explicitly flags that `continual-harness`
   and other deps "must be license-compatible with your choice" of license (MIT vs Apache-2.0,
   undecided — see `legal/`). We must not build on it until this is verified.
2. **The harness can propose changes, but it can never promote one.** Ratchet's invariants are
   non-negotiable: the *only* path into the active skill set is the proof gate via
   `@ratchet/core/promotion` (AGENTS.md invariant 1), with evaluator independence (invariant 2),
   regression-gating (invariant 3), and cost/loop guards (invariant 6). A self-rewriting harness is a
   **proposer**, fully downstream of the gate.

## Decision

**Build on / interoperate with `continual-harness` as the self-rewriting mechanism for v2**, wrapped
behind Ratchet's provider/adapter boundary, **conditional on confirming license compatibility** with
Ratchet's chosen license. Specifically:

- The harness is integrated as an **adapter** (in `packages/providers` or a dedicated adapter), behind
  a stable interface — `core` never depends on it directly (provider-agnostic, `overview.md` §6).
- Anything the harness produces is a **candidate** that must pass the full proof gate
  (`proof-gate.md`) before promotion. No harness output bypasses the gate; there is no "force
  promote."
- The harness's self-rewrite loop runs **inside Ratchet's budgets** — `maxIterations`, `maxTrials`,
  `maxCostUSD` (AGENTS.md invariant 6; `config-schema.md`). Ratchet owns the loop guards regardless of
  the harness's own controls.
- All harness-driven runs emit Ratchet manifests (model id, seed, configHash, datasetId) like any
  other path (invariant 7).

**Status stays `Proposed` until** legal confirms the license is compatible (Inventory I1). If it is
not, this ADR is superseded by one choosing an alternative (own implementation or a differently-licensed
harness).

## Consequences

**Positive**
- Reuses peer-reviewed, purpose-built machinery for the hardest part of v2 instead of reinventing it.
- Aligns Ratchet with existing research and eases interoperability/credibility with the researcher
  persona.
- Clean separation: harness = mechanism (proposer), Ratchet = the verified gate + ledger. Our
  differentiator (proof + forward-only) is unchanged and unweakened.

**Negative / costs / risks**
- **License risk** is the gating concern — unresolved until legal sign-off; building before that is a
  blocked action (status `Proposed`, not `Accepted`).
- **Upstream coupling:** a third-party self-rewriter is an external dependency that can change or stall.
  Mitigated by the adapter boundary — we can swap mechanisms without touching `core` or the gate.
- **Safety/attack surface:** a self-rewriting component is exactly the kind of thing the threat model
  worries about (memory poisoning, runaway loops). Mitigated because the harness is strictly a
  proposer behind the gate, under Ratchet's budgets, with all output sanitized at distillation and
  treated as untrusted (AGENTS.md §Security; `../ai-considerations.md`; `../security/threat-model.md`).

## Related
`0001-record-architecture-decisions.md` · `../proof-gate.md` · `../ai-considerations.md` ·
`../overview.md` · `AGENTS.md` · `Ratchet-Project-Artifact-Inventory.md` (I1)
