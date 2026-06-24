# Ratchet — Definition of Done (DoD)

> Ratchet's entire thesis is "prove it's actually done." This document has to be exemplary.
> "Done" is not "it runs on my machine." Done is **verified, safe, documented, and shippable.**

A change is **Done** only when every applicable gate below passes. Gates are AND-ed, not averaged.

---

## 1. Universal DoD (every change)

- [ ] Code compiles: `pnpm typecheck` clean (strict, no `any`).
- [ ] `pnpm lint` and `pnpm format` clean.
- [ ] `pnpm test` green; new logic has tests; coverage on changed lines does not drop.
- [ ] All external/model output validated through `@ratchet/schema` at the boundary.
- [ ] No secrets/PII added to code, vault, ledger, logs, or fixtures.
- [ ] Affected docs updated **in the same PR** (docs are code).
- [ ] `CHANGELOG.md` updated; Conventional Commit message.
- [ ] If an `AGENTS.md` invariant is touched, the PR description names it and explains why it still holds.

## 2. Feature DoD (user-facing capability)

- [ ] Maps to a user story with acceptance criteria; criteria are demonstrably met.
- [ ] CLI and/or MCP surface updated and documented (`docs/architecture/cli-mcp-interface.md`).
- [ ] Sensible defaults; zero-config path still works.
- [ ] Cold-start behavior verified (works with zero skills present).
- [ ] Error states fail closed with a clear, human-readable message.
- [ ] Cost/latency within budget for the affected path.

## 3. ⭐ Learning-feature DoD (distillation / proof / regression / promotion)

This is the heart of the product. A learning feature is **not Done** without all of:

- [ ] **Meta-eval passes:** `pnpm eval` shows false-promote and false-reject rates within `evals/THRESHOLDS.md`. *Testing the prover itself is mandatory.*
- [ ] **Evaluator independence preserved:** proposer ≠ verifier config; verified in tests.
- [ ] **Regression suite intact:** promotion runs the full regression set over earned skills; a deliberately-bad skill is rejected in tests.
- [ ] **Statistical validity:** results meet the minimum-trials and significance bar in `proof-gate.md`; no promotion on a single lucky run.
- [ ] **Determinism receipts:** every ProofRun writes a complete manifest (model, seed, config hash, dataset id).
- [ ] **Fail-closed proven:** if proof/regression cannot run, the candidate is NOT promoted (tested).
- [ ] **Leakage check:** held-out tasks are not derivable from the candidate's training trace.

## 4. Security & privacy DoD

- [ ] Change reviewed against `docs/security/threat-model.md` (esp. memory poisoning, prompt injection).
- [ ] Captured content treated as untrusted; sanitization covers the new path.
- [ ] Imported/shared skills (v3) are not auto-trusted; provenance/proof verified before use.
- [ ] No new secret sinks; `.env.example` updated if config added.

## 5. Documentation DoD (Diátaxis-aligned)

- [ ] Reference updated (schemas, CLI flags, config keys).
- [ ] If behavior changed, the relevant how-to/tutorial updated.
- [ ] Any non-obvious decision captured as an ADR (`docs/architecture/adr/`).

## 6. Release DoD (cutting a version)

- [ ] All above gates green on `main`.
- [ ] `pnpm eval` green on the release candidate.
- [ ] CHANGELOG finalized; semver bump correct (schema change ⇒ at least minor + migration).
- [ ] Migration tested if any `@ratchet/schema` object changed.
- [ ] `npx ratchet@<version> init` works from a clean machine (smoke test).
- [ ] Security disclosure path current (`SECURITY.md`).

---

## The one-line version
> If it touches learning and there's no passing **meta-eval**, it is **not done** — full stop. Everything else is table stakes; *proof* is the product.
