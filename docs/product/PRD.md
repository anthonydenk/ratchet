# Ratchet — Product Requirements Document (PRD)

**Status:** Draft v0.1 · **Owner:** Anthony Denkinger (@anthonydenk) · **Last updated:** 2026-06

---

## 1. Problem

AI coding agents don't get better. They forget your project between sessions, repeat mistakes you already corrected, and re-break things they previously fixed. The current wave of "AI memory" tools stores notes and retrieves them — but none of them can tell whether a remembered "lesson" actually *helps*, separate a real lesson from a lucky fluke, or stop new learning from silently degrading what already worked. The result: agents that *claim* to improve, with no proof, and that quietly backslide.

This matters now because the field is pivoting to self-improving agents ("the era of experience"), and the documented failure modes are real: agents are *"not always faithful self-evolvers"* — they hallucinate their own progress.

## 2. Vision

An agent that learns *you* and can **prove** it. Ratchet is the verified continual-learning layer that turns your sessions into earned, proven skills — memory that becomes capability, with receipts, and that never backslides.

**Positioning line (street):** *XP for your AI — it levels up at your work, and has to earn every skill.*
**Positioning line (technical):** *A verified, regression-gated continual-learning loop for agents.*

## 3. Target users

| Persona | Who | What they want | What they fear |
|---|---|---|---|
| **The vibe coder** (primary) | Builds with AI, not classically trained | An agent that stops forgetting and gets visibly better; one-command setup | Complexity, jargon, anything that feels like "real DevOps" |
| **The serious builder / researcher** (secondary) | Engineer or AI-curious pro | Rigor: real evals, no self-delusion, auditable proof | Hype with no substance; another wrapper |

Ratchet must satisfy both: magical to the first, respectable to the second.

## 4. Value proposition

- **Stops the goldfish problem** — your agent remembers your project, stack, and preferences.
- **Proves improvement** — nothing is "learned" until it beats baseline; you see the curve.
- **Never backslides** — forward-only; earned skills are protected by regression checks.
- **You own it** — knowledge lives in readable markdown in your vault, local-first.
- **Drops onto your setup** — a layer over the agent you already use, not a replacement.

## 5. Scope

### In scope (the product)
- Capture sessions from a host agent.
- Distill sessions into human-readable knowledge notes.
- Propose candidate skills; **prove** them via the proof gate; promote winners.
- Maintain a skill ledger + improvement curve; render a shareable "level-up card."
- CLI + MCP surfaces; markdown/Obsidian substrate; provider-agnostic.

### Explicit non-goals (see `non-goals.md`)
- Not a new model. Not a new agent/IDE. Not a hosted cloud service (v0–v2 are local-first).
- Not a general note-taking app. Not a fine-tuning/training pipeline for base models.

## 6. Release strategy

| Version | Theme | Ships | Success = |
|---|---|---|---|
| **v0** | The hook | Session → clean reusable note in vault | People say "this alone is useful" |
| **v1** | The differentiator | Proof gate + regression guard + ledger | One agent provably improves at a real task, with receipts |
| **v2** | The magic | Continual self-rewriting, all proof-gated | Agent refines its own skills unattended, safely |
| **v3** | The network | Verified Experience Commons (portable proven skills) | Skills shared across agents with proof + provenance |

## 7. Success metrics (North Star + supporting)

- **North Star:** *number of **proven skills promoted** per active user per week* (real, verified learning — not notes stored).
- **Activation:** % of installs that earn their first proven skill within 24h.
- **Retention:** % of users whose agents are still leveling up at week 4.
- **Trust:** meta-eval false-promote rate ≤ target (see `docs/testing/meta-evals.md`).
- **Virality:** level-up cards shared / week; GitHub stars; `npx ratchet` installs.

## 8. Key risks (and where they're handled)

| Risk | Mitigation | Doc |
|---|---|---|
| "Proves" nonsense (bad eval design) | Rigorous proof-gate + statistical validity | `proof-gate.md` |
| Agent games its own proof | Evaluator independence | `proof-gate.md`, `AGENTS.md` |
| Silent forgetting | Regression suite, fail-closed | `proof-gate.md` |
| Memory poisoning via conversation | Threat model + sanitization + gate-as-defense | `security/threat-model.md` |
| Cost blow-up | Tiered escalation, hard budgets | `proof-gate.md`, `config-schema.md` |
| "Just another memory tool" perception | Lead with proof; the ledger is the proof | `gtm/` |

## 9. Open questions

- Which host agent to support first for v0 (Claude Code vs. Codex vs. OpenCode)?
- Default proof-task source: user-provided, auto-synthesized, or hybrid?
- License: MIT vs Apache-2.0 (patent grant) — see `legal/`.

## 10. References

Era of experience & self-evolving agents; *LLM Agents Are Not Always Faithful Self-Evolvers* (arXiv 2601.22436); Continual Harness (Karten et al., arXiv 2605.09998); OWASP Top 10 for Agentic Applications (2026). Full list in `docs/research/sources.md`.
