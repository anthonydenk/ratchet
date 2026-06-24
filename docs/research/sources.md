# Ratchet — Research Sources

> The grounding for Ratchet. We **stand on open shoulders** — this is the
> reading that shaped the design, with an honest "why it matters to Ratchet" on
> each. Generosity reads as confidence: credit the work, then say plainly what
> we took from it.

Grouped by theme:
1. **Self-evolving agents** — the field Ratchet plays in.
2. **The faithfulness problem** — why a proof gate is necessary, not optional.
3. **The verification mechanism** — how to test honestly (juries, harnesses).
4. **Security for agentic systems** — the attack surface of a self-learning agent.
5. **Substrate & interop standards** — vault, CLI, and agent conventions.

> Note on citations: arXiv identifiers and project links are recorded as
> provided in the project canon. Where an ID looks unusual, it's flagged in the
> "Inconsistencies / to verify" section at the bottom rather than silently
> changed — the schema for this project values receipts over guesses.

---

## 1. Self-evolving agents (the field)

| Source | Ref | Why it matters to Ratchet |
|---|---|---|
| **A Survey of Self-Evolving Agents** | arXiv 2507.21046 | Maps the "era of experience" landscape Ratchet sits in — agents that improve from their own experience. Frames the category and the open problems Ratchet's honesty layer targets. |
| **Continual Harness** — Karten et al. | arXiv 2605.09998 · [github.com/sethkarten/continual-harness](https://github.com/sethkarten/continual-harness) | The open self-rewriting-agent mechanism Ratchet builds on (v2). Our contribution is moving it from its original domain to real knowledge work and **wrapping it in the proof gate** — we don't rebuild the engine, we add the honesty. |
| **Group-Evolving Agents: Open-Ended Self-Improvement via Experience Sharing** | arXiv 2602.04837 | Research already gesturing at the v3 idea — sharing experience between agents. Validates the **Verified Experience Commons** direction: once a skill is provable, it becomes a portable, shareable unit. |

## 2. The faithfulness problem (why the proof gate exists)

| Source | Ref | Why it matters to Ratchet |
|---|---|---|
| **LLM Agents Are Not Always Faithful Self-Evolvers** | arXiv 2601.22436 | The keystone citation. Documents that agents *hallucinate their own progress* — they believe they improved when they didn't. This is exactly **self-delusion**, the failure mode the proof gate is built to stop. If this paper is right, "trust me, it learned" is indefensible — which is the entire reason Ratchet exists. |

> These three failure modes, named in the README and PRD, are what the proof
> gate + regression suite defend against:
> - **self-delusion** — believing it improved when it didn't (the faithfulness paper),
> - **noise-as-signal** — keeping a lucky fluke (→ statistical-validity bar),
> - **catastrophic forgetting** — new learning silently degrading old skills (→ regression suite).

## 3. The verification mechanism (how to test honestly)

> Ratchet's gate depends on **evaluator independence** (the proposer must not be
> the grader) and on aggregating multiple judgments rather than trusting one.
> This literature is the basis for that design.

| Source | Ref | Why it matters to Ratchet |
|---|---|---|
| **Replacing Judges with Juries: Evaluating LLM Generations with a Panel of Diverse Models** — Verga et al. | (Verga et al., PoLL) | The case for a *panel* of diverse evaluators over a single judge — reduces intra-model bias and self-preference. Grounds Ratchet's separation of proposer and verifier roles, and the "council/jury" shape of the gate. |
| **Nine Judges, Two Effective Votes** | arXiv 2605.29800 | Sharpens the jury idea: more judges yield diminishing *independent* signal. Directly informs how many evaluators/trials Ratchet needs before trusting a verdict — relevant to the minimum-trials and significance bar in the proof gate (avoid paying for redundant votes). |
| **Continual Harness** (meta-eval lens) | see §1 | Beyond the engine, its harness framing supports Ratchet's **meta-eval** discipline: test the prover itself, measuring false-promote / false-reject rates against a labeled set. |

## 4. Security for agentic systems (the attack surface)

| Source | Ref | Why it matters to Ratchet |
|---|---|---|
| **OWASP Top 10 for Agentic Applications (2026)** | OWASP | Names **memory poisoning** and **prompt injection** as first-class agentic risks. Every captured conversation is untrusted input that could plant a bad "lesson," so Ratchet treats capture as a poisoning vector and uses the **proof gate as a defense, not a formality.** Anchors `docs/security/threat-model.md`. |
| **The shared-skill supply-chain risk** (the "ClawHub crisis" reference) | per project canon | The cautionary tale for v3: a commons of shared skills becomes a malware vector without verifiable origin. Motivates **provenance + signing + mandatory local re-verification** for imported skills — designed into the schema now, even though sharing ships later. |

## 5. Substrate & interop standards (vault, CLI, conventions)

| Source | Ref | Why it matters to Ratchet |
|---|---|---|
| **Obsidian** + official CLI (Feb 2026) | [obsidian.md](https://obsidian.md) | The transparent, user-owned memory substrate. Ratchet writes human-readable markdown the user can read, edit, and own — local-first, no lock-in. We interoperate with the vault-memory pattern rather than fight it. |
| **Obsidian second-brain projects** | MindStudio *AI Second Brain with Claude Code + Obsidian*; `obsidian-second-brain`; `obsidian-mind`; `obsidian-agent-memory-skills` | The crowded "capture → distill → store → self-rewrite" field Ratchet differentiates from. They stop at "trust me, it learned"; Ratchet adds the **proof gate** they all skipped. Useful as both prior art and positioning contrast. |
| **AGENTS.md spec** (under the Linux Foundation) | AGENTS.md | The open convention for instructing AI coding agents in a repo. Ratchet's own `AGENTS.md` follows it, and the spec informs how promoted skills are surfaced to host agents in a portable, standard way. |

---

## How the sources map to Ratchet's design

| Design pillar | Grounded by |
|---|---|
| Continual learning from experience | Self-evolving survey (2507.21046); Continual Harness (2605.09998) |
| **The proof gate is necessary** | *Not Always Faithful Self-Evolvers* (2601.22436) |
| Evaluator independence / jury | Verga et al. (PoLL); *Nine Judges, Two Effective Votes* (2605.29800) |
| Statistical validity (how many trials) | *Nine Judges, Two Effective Votes* (2605.29800) |
| Meta-evals (test the tester) | Continual Harness; faithfulness paper |
| Threat model (memory poisoning) | OWASP Top 10 for Agentic Applications (2026) |
| v3 provenance + signing | ClawHub-crisis lesson; Group-Evolving Agents (2602.04837) |
| Owned markdown substrate | Obsidian + CLI; second-brain projects |
| Agent interop | AGENTS.md (Linux Foundation) |

---

## Inconsistencies / to verify

Recorded honestly rather than silently "corrected":

- **Continual Harness arXiv ID.** The README and `skill-schema`-adjacent canon
  cite this work but the PRD lists the arXiv as **2605.09998** while the
  *Product-Definition.md* sources cite it as "Karten et al., 2026" without an
  arXiv number. IDs used here follow the PRD/brief. Verify the canonical arXiv
  number before publication.
- **Forward-dated arXiv identifiers.** Several IDs (2601.x, 2602.x, 2605.x,
  2507.x) imply 2025–2026 submission dates consistent with the project's 2026
  framing. Confirm each resolves before citing externally.
- **"Replacing Judges with Juries" (Verga et al.)** is cited by title in the
  brief without an arXiv number; add the identifier (PoLL / Panel of LLm
  evaluators) when finalizing.
- **The "ClawHub crisis"** is referenced in the artifact inventory (E5) as a
  supply-chain cautionary example; confirm the canonical reference/source before
  citing it as fact externally.
```