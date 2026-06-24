# Ratchet — Documentation Index

> The master map of the entire docs suite. Every doc, one line each, grouped by
> category, plus a **start-here reading order** for new contributors. If you're
> lost, you're in the right file.
>
> **What Ratchet is, in one line:** an open, verified continual-learning layer for
> AI agents — *XP for your AI; it levels up at your work and has to earn every
> skill.* Capture → distill → **prove** → promote → ledger.
>
> Paths are relative to the repo root. ✅ = exists today · 🔜 = planned (tracked,
> not yet written).

---

## Start here (reading order for new contributors)

Read these in order; it takes you from "what is this" to "how it actually works"
to "how do I contribute safely."

1. **`README.md`** — the front door. What Ratchet is and why it's different (the proof gate).
2. **`docs/product/PRD.md`** — the problem, the user, the value, scope, the four versions.
3. **`docs/product/roadmap.md`** — v0 → v3, each phase independently useful. The arc.
4. **`docs/architecture/overview.md`** — the system: capture → distill → prove → promote → ledger.
5. **`docs/architecture/skill-schema.md`** — ⭐ the single most important spec; portable from day one.
6. **`docs/architecture/proof-gate.md`** — ⭐ the heart of the product: how "better" is proven.
7. **`docs/architecture/ai-considerations.md`** — the AI-specific hard problems that decide if it works.
8. **`AGENTS.md`** — the non-negotiable invariants (only the gate promotes; evaluator independence; fail closed).
9. **`docs/testing/meta-evals.md`** — "test the tester," or it's all faith.
10. **`CONTRIBUTING.md`** — how to get involved without breaking an invariant.
11. **`docs/BUILD-ROADMAP.md`** — the build game plan: phases, critical path, the 7 sinkers, first 30 days.

> Shortcut for the impatient: **README → roadmap → proof-gate → BUILD-ROADMAP.**

---

## Root files (repo hygiene & governance)

| Doc | One-liner |
|---|---|
| `README.md` ✅ | The front door: goldfish-brain hook, the proof gate, quickstart, roadmap. |
| `AGENTS.md` ✅ | The invariants for any agent/contributor working on Ratchet — the rules that must never break. |
| `LICENSE` ✅ | MIT (© 2026 Anthony Denkinger). |
| `CONTRIBUTING.md` ✅ | How to contribute; lowers the barrier for first contributors. |
| `SECURITY.md` ✅ | Responsible vulnerability disclosure policy. |
| `CODE_OF_CONDUCT.md` 🔜 | Community standards (Inventory F4). |
| `CHANGELOG.md` 🔜 | What changed, per release; semver policy (Inventory F6). |
| `GOVERNANCE.md` 🔜 | "Open and independent" stance; who decides as it grows (Inventory F10). |
| `SUPPORT.md` 🔜 | Where to get help + honest response expectations (see `docs/ops/maintenance.md`). |
| Issue / PR templates 🔜 | Make good bug reports and PRs easy (Inventory F5). |

---

## Product (`docs/product/`)

| Doc | One-liner |
|---|---|
| `product/PRD.md` ✅ | Product requirements: problem, vision, users, scope, release strategy, metrics, risks. |
| `product/personas.md` ✅ | The two audiences: the vibe coder (magical) and the researcher (respectable). |
| `product/user-stories.md` ✅ | Jobs-to-be-done that drive the feature list and the tests. |
| `product/non-goals.md` ✅ | What Ratchet deliberately is NOT (no new model/agent, no hosted service v0–v2). |
| `product/success-metrics.md` ✅ | North Star (proven skills/active user/week) + the Acquisition→Activation→Retention→Trust→Virality tree. |
| `product/definition-of-done.md` ✅ | Acceptance criteria per feature — the meta-exemplary "definition of done." |
| `product/roadmap.md` ✅ | v0 (hook) → v1 (proof gate) → v2 (self-rewriting) → v3 (commons), with exit criteria. |

---

## Architecture (`docs/architecture/`)

| Doc | One-liner |
|---|---|
| `architecture/overview.md` ✅ | The blueprint: components and data flow, capture → distill → prove → promote → ledger. |
| `architecture/skill-schema.md` ✅ | ⭐ What a "skill" object is — content, provenance, proof, version. Portable from day one or no v3. |
| `architecture/proof-gate.md` ✅ | ⭐ How "better" is defined and measured: held-out checks, baseline, significance, leakage, regression. |
| `architecture/ai-considerations.md` ✅ | The AI-specific hard problems (defining better, statistical validity, gaming, forgetting, poisoning, cold start, cost). |
| `architecture/note-format.md` ✅ | How distilled knowledge is written to markdown/Obsidian — human-readable + machine-parseable. |
| `architecture/ledger-and-card.md` ✅ | How earned skills + proof + curve are stored and rendered into the shareable level-up card. |
| `architecture/cli-mcp-interface.md` ✅ | The public API: CLI commands (`init`, `watch`, `ledger`…) and the MCP tool surface. |
| `architecture/config-schema.md` ✅ | What users configure (agent, models, vault path, budgets) with zero-config defaults. |

### Architecture Decision Records (`docs/architecture/adr/`)

| ADR | One-liner |
|---|---|
| `adr/0001-record-architecture-decisions.md` ✅ | We will record architecture decisions as ADRs. |
| `adr/0002-typescript-node-stack.md` ✅ | Why the TypeScript/Node stack. |
| `adr/0003-markdown-vault-substrate.md` ✅ | Why markdown/Obsidian is the transparent, user-owned memory substrate. |
| `adr/0004-build-on-continual-harness.md` ✅ | Build on continual-harness for v2 self-rewriting — license now **confirmed MIT** (`legal/risk-and-compliance.md` §1). |

---

## Testing & quality (`docs/testing/`, `evals/`)

| Doc | One-liner |
|---|---|
| `testing/test-strategy.md` ✅ | The overall approach: unit vs. integration vs. eval; the dogfooding plan. |
| `testing/meta-evals.md` ✅ | ⭐ Testing the prover itself — false-promote / false-reject rates. Test the tester or it's all faith. |
| `testing/fixtures.md` ✅ | Golden datasets: sample conversations, known-good and known-bad skills. |
| `testing/non-determinism.md` ✅ | How to test components whose output varies run-to-run (mock, seed, snapshot ranges). |
| `evals/THRESHOLDS.md` ✅ | The release-blocking bars for the meta-evals (`pnpm eval`). |

---

## Security & privacy (`docs/security/`)

| Doc | One-liner |
|---|---|
| `security/threat-model.md` ✅ | ⭐ Memory poisoning, prompt injection, malicious shared skills (v3), supply chain — the proof gate as defense. |
| `security/privacy.md` ✅ | What's stored vs. redacted; local-only guarantees. A selling point, not fine print. |
| `security/secrets.md` ✅ | API-key handling — never logged, never in the vault; env/keychain only. |
| `security/provenance-signing.md` ✅ | For v3: verifiable origin + signing so the commons isn't a malware vector. |

---

## Go-to-market (`docs/gtm/`)

| Doc | One-liner |
|---|---|
| `gtm/landing-copy.md` ✅ | Full landing page copy: goldfish/XP hero, the 4 pains, proof differentiator, dual-language, FAQ, CTAs. |
| `gtm/launch-thread-and-medium.md` ✅ | Ready-to-post X launch thread + Medium article ("I gave my AI a memory that has to earn its skills"). |
| `gtm/demo-and-level-up-card.md` ✅ | The 20-second demo shot list + the auto-generated level-up card spec — virality as a built feature. |
| `gtm/launch-plan.md` ✅ | Sequenced launch (pre / day-of / post), metrics to watch, timing, and the "just another memory tool?" playbook. |

---

## Ops & maintenance (`docs/ops/`)

| Doc | One-liner |
|---|---|
| `ops/maintenance.md` ✅ | Opt-in privacy-respecting telemetry, error reporting, support channels, release cadence, triage rhythm. |

---

## Legal & risk (`docs/legal/`)

| Doc | One-liner |
|---|---|
| `legal/risk-and-compliance.md` ✅ | Dependency licenses (continual-harness = MIT, confirmed), provider-ToS distinction, "Ratchet" trademark sweep, disclaimers. |

---

## Research (`docs/research/`)

| Doc | One-liner |
|---|---|
| `research/sources.md` ✅ | The reading list: era-of-experience, faithful self-evolvers, Continual Harness, OWASP agentic, group-evolving agents. |

---

## The doc map by purpose (quick lookup)

| If you want to… | Read |
|---|---|
| Understand the pitch | `README.md`, `gtm/landing-copy.md` |
| Understand the product decisions | `product/PRD.md`, `product/roadmap.md`, `product/non-goals.md` |
| Understand how it's built | `architecture/overview.md`, `architecture/skill-schema.md`, `architecture/proof-gate.md` |
| Understand why it won't lie | `architecture/proof-gate.md`, `testing/meta-evals.md`, `product/success-metrics.md` (§Trust) |
| Understand the risks | `architecture/ai-considerations.md`, `security/threat-model.md`, `legal/risk-and-compliance.md` |
| Launch it | `gtm/launch-plan.md`, `gtm/demo-and-level-up-card.md`, `gtm/launch-thread-and-medium.md` |
| Run it after launch | `ops/maintenance.md` |
| Build it | `docs/BUILD-ROADMAP.md` |
