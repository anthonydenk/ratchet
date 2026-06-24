# Ratchet — Non-Goals (what Ratchet is deliberately NOT)

> Scope discipline is a feature. Ratchet is a **layer**, not a replacement —
> the moment it tries to be a model, an agent, or a cloud, it loses the thing
> that makes it work: it drops onto the setup you already have, and your
> knowledge stays yours. This doc says no on purpose, with a one-line reason
> each, so the product stays sharp and contributors know where the edges are.

The product *is*: an open, local-first, **verified continual-learning layer** —
the capture → distill → prove → promote → ledger pipeline, with the proof gate
and forward-only ratchet as the unique IP. Everything below is explicitly out.

---

## Core non-goals

| # | Ratchet is **not**… | One-line rationale |
|---|---|---|
| **NG1** | **a new model** | We don't train or serve an LLM; Ratchet improves the agent's *context and skills*, and stays model-agnostic so it won't rot when a model changes. |
| **NG2** | **a new agent or IDE** | It's a layer over the agent you already run (Claude Code, Codex, OpenCode…); building a competing agent would throw away the "drops onto your setup, zero rebuild" advantage. |
| **NG3** | **a hosted / cloud service (v0–v2)** | Local-first by design — your conversations contain secrets and PII, so the data never has to leave your machine; v0–v2 ship with no server to trust. |
| **NG4** | **a note-taking / second-brain app** | The vault is a *substrate we interoperate with* (Obsidian / plain markdown), not a destination; the differentiator is the proof gate, not another place to keep notes. |
| **NG5** | **a base-model fine-tuning / training pipeline** | We change the agent's working skills and context, not model weights — which also keeps us clear of "don't use outputs to train a model" provider-ToS concerns. |

---

## Adjacent non-goals (worth saying out loud)

These aren't in the brief's core list, but they follow from the same scope
discipline and prevent the most common "wouldn't it be cool if…" creep.

| # | Ratchet is **not**… | One-line rationale |
|---|---|---|
| NG6 | a generic eval framework | The proof gate exists to *promote skills honestly*, not to be a standalone benchmarking product. |
| NG7 | a prompt-engineering or template marketplace | Skills are *earned and proven*, not authored-and-sold; a candidate with no proof is just a draft. |
| NG8 | a team / multiplayer collaboration tool | Single-user and local-first first; cross-agent skill exchange is the v3 *commons*, which is sharing **proven units**, not shared editing. |
| NG9 | an analytics / telemetry product | Any telemetry is opt-in and privacy-respecting; we never read or upload vault content. |
| NG10 | an autonomous code-writing or auto-merge agent | Ratchet learns *about* your work; it doesn't take unattended actions on your codebase. Self-rewriting (v2) edits *skills*, gated by proof — never your repo. |

---

## On the v3 commons (a clarification, not a contradiction)

The **Verified Experience Commons** (v3) might look like it breaks NG3 (no
hosted service) or NG8 (not multiplayer). It doesn't:

- The commons exchanges **portable proven skills** — a `SkillEnvelope` (skill +
  its deciding ProofRun + signature) — not live collaboration or a hosted brain.
- An imported skill is **untrusted until re-verified locally** and its signature
  checked; it's never auto-promoted. The trust stays local even when the skill
  travels.
- Whatever distribution mechanism v3 uses, the **local-first guarantee for your
  own vault is non-negotiable**: your private knowledge never has to leave your
  machine to participate.

> The short version: Ratchet is the **honesty layer** that sits on top of the
> tools you already use. Every non-goal above protects that. If a proposed
> feature makes Ratchet *the model*, *the agent*, *the cloud*, or *the
> note-app*, the answer is no — point at this doc.
```