# Ratchet — Personas

> Ratchet has one product and two audiences. The whole thing only works if it's
> **magical to the first and respectable to the second** — same pipeline,
> two languages. This doc names who they are, what they're chasing, what hurts,
> and how to talk to each.

There are two personas. The **vibe coder** is primary (the reach engine, the
person who shares the level-up card). The **serious builder / researcher** is
secondary but load-bearing — they're the ones who decide whether the proof is
real, and their respect is what keeps Ratchet from reading as "just another
memory tool."

A rule of thumb, borrowed from the README: *if your mom can't understand the
hook, rewrite the hook. If a researcher can't respect the README, rewrite the
README. You need both.*

---

## Persona 1 — Maya, the vibe coder (primary)

> *"My AI has goldfish brain. I just want it to stop forgetting and actually get better at my stuff."*

| | |
|---|---|
| **Who** | Builds real software with AI agents; didn't take the classical CS route. Comfortable in Claude Code / Cursor / Codex, less so in a stack trace. |
| **Tools** | A host agent + an editor + `npx`. Maybe Obsidian. Not a CI dashboard person. |
| **Mental model** | Games, RPGs, skill trees, streaks. "Leveling up" is instantly legible; "regression-gated promotion" is not. |
| **Relationship to rigor** | Trusts a *visible result* over a methodology. Wants to *see* the curve go up, not read about p-values. |

### Goals

- An agent that **remembers her project** — stack, conventions, the rules she
  already gave it — without re-explaining every session.
- Visible, satisfying progress: proof that the thing is actually getting better
  at *her* work, not generically.
- One-command setup that drops onto the setup she already has. Zero config,
  zero new concepts to learn.
- Something **shareable** — a flex, a streak, a "look what mine learned."

### Pains

| Pain (in her words) | What it really is |
|---|---|
| "I re-explain my whole project every. single. session." | Stateless agent / no persistent memory |
| "It keeps making the mistake I already corrected." | No durable lesson retention |
| "It fixed the bug, then re-broke it next week." | Catastrophic forgetting / regression |
| "I never know if it's actually better or just vibing." | No measurement, no receipts |

### What success feels like

She runs `npx ratchet init`, works like normal for a couple of days, runs
`npx ratchet ledger`, and sees a short list of skills her agent **earned** — with
a line going up. Next session the agent nails the task it kept fumbling. She
screenshots the level-up card and posts it. It feels like her AI grew a memory
and *leveled up* on her actual code.

### How Ratchet serves her

- **`npx ratchet` one-liner** — drops onto her existing agent + vault, no new
  model, no new IDE, no rebuild.
- **The level-up card + ledger** — the honesty layer rendered as a character
  sheet and a rising curve. The hard part (proof) shows up as a *fun, obvious*
  thing instead of an academic one.
- **The vault is hers** — readable markdown in Obsidian she can open and edit.
  Nothing is locked away.
- **Cold start feels magical, not empty** — first run does something useful
  (a clean note from a session) before any skill is earned.

---

## Persona 2 — Dev, the serious builder / researcher (secondary)

> *"Show me you're not fooling yourself. How do you know it actually improved — and that it didn't quietly break something else?"*

| | |
|---|---|
| **Who** | An engineer, ML-curious pro, or researcher. Has read the self-evolving-agents literature, or could. |
| **Tools** | Lives in the terminal, reads source, runs the eval suite, opens the schema. |
| **Mental model** | Baselines, held-out sets, statistical significance, regression suites, threat models. |
| **Relationship to rigor** | Rigor *is* the trust. A claim of "improvement" with no manifest is worthless; a self-graded eval is a red flag. |

### Goals

- A continual-learning loop that is **honest** — no self-delusion, no
  noise-as-signal, no silent forgetting.
- **Auditable proof:** every promotion backed by a ProofRun manifest (model id,
  seed, config hash, dataset id) he can inspect.
- **Evaluator independence** he can verify in code — the proposer is not the
  grader.
- A **portable skill format** with provenance, so the v3 commons isn't a
  fantasy bolted on later.
- A project that takes the attack surface seriously (memory poisoning, prompt
  injection, malicious shared skills).

### Pains

| Pain | What it really is |
|---|---|
| "Every 'AI memory' tool just says *trust me, it learned*." | Unverified claims; no measurement |
| "Self-improving agents hallucinate their own progress." | The *faithful self-evolver* problem (arXiv 2601.22436) |
| "New learning silently degrades old capability." | Catastrophic forgetting with no regression guard |
| "Who tests the tester?" | No meta-eval; the prover itself is unproven |
| "A poisoned conversation could plant a bad lesson." | Named OWASP agentic risk; self-learning is an attack surface |

### What success feels like

He reads the README and it *earns his respect* instead of triggering an
eye-roll. He opens `skill-schema.md` and sees portability, provenance, and
evaluator independence designed in from day one. He runs `pnpm eval` and watches
the prover get measured against a labeled set — false-promote and false-reject
rates inside published thresholds. He concludes: *this team tests the tester.*

### How Ratchet serves him

- **The proof gate** — candidates promote only if they beat baseline on a
  held-out check **and** pass the regression suite over every earned skill;
  fail-closed on uncertainty.
- **Meta-evals** (`pnpm eval`) — the prover itself is measured. "Test the
  tester, or it's all faith."
- **Determinism receipts** — every ProofRun writes a manifest; no "improvement"
  is reported without one.
- **The canonical Zod schema** — Skill, Note, ProofRun, Ledger are typed, versioned,
  migratable, and portable, with provenance and signing hooks for v3.
- **A documented threat model** — captured conversations are treated as untrusted
  input; the gate is a defense, not a formality.

---

## The two personas at a glance

| | **Maya (vibe coder)** | **Dev (builder / researcher)** |
|---|---|---|
| Priority | Primary | Secondary (load-bearing) |
| Wants | Memory that visibly levels up | Proof that the learning is real |
| Fears | Complexity, jargon, "real DevOps" | Hype with no substance, self-delusion |
| Trusts | The rising curve, the card | The manifest, the meta-eval, the schema |
| Hero surface | Ledger + level-up card | Proof gate + `pnpm eval` + schema |
| Hero artifact | `npx ratchet` + the shareable card | The ProofRun receipt + thresholds |
| Success | "My AI leveled up at *my* work" | "They test the tester. I believe it." |
| Killer line | "XP for your AI." | "A verified, regression-gated continual-learning loop." |

---

## Voice for each audience (cheat-sheet)

Same truth, two registers. Lead with the feeling for Maya; lead with the
mechanism for Dev. Never hype either one — the brand voice is curious, warm,
lightly playful, *not* "ship ship ship."

| Concept | Say to **Maya** (plain, felt) | Say to **Dev** (precise, earned) |
|---|---|---|
| Stateless agent | "Your AI has goldfish brain — it forgets everything." | "Host agents are effectively stateless across sessions." |
| Continual learning | "It actually learns *you* — your stack, your style, your rules." | "Verified continual-learning loop over your sessions." |
| Distillation | "Every chat makes it smarter. For real." | "Sessions distilled into candidate skills; most of a transcript is noise." |
| The proof gate | "It can't *lie* about getting better — it has to prove it." | "Promotion requires beating baseline on a held-out check, gated by regression." |
| Evaluator independence | "The part that brags isn't the part that grades." | "Proposer config ≠ verifier config; enforced in schema + tests." |
| Catastrophic forgetting | "It never breaks the stuff that already worked." | "Forward-only ratchet; regression suite over all earned skills, fail-closed." |
| Statistical validity | "No flukes count. It has to do it for real." | "Minimum-trials + significance bar; no promotion on a single lucky run." |
| Meta-eval | "We even test the tester, so it can't fool itself." | "Meta-evals measure the prover's false-promote / false-reject rates against thresholds." |
| Skill ledger | "Watch your AI **level up**." | "Append-only ledger of promotions with proof references and a benchmark curve." |
| Provenance / commons (v3) | "Borrow a skill another AI already earned — safely." | "Portable skill envelope: skill + deciding ProofRun + signature, re-verified locally." |
| Ownership / privacy | "It's your notes, in your vault. Your data never leaves." | "Local-first; vault is user-readable; secrets/PII redacted at distillation." |

### Tone do / don't (both audiences)

- ✅ Curious, warm, a little playful. "Isn't this wild, look what's possible now."
- ✅ Credit the shoulders we stand on (Continual Harness, Obsidian, the research).
- ✅ Let the idea be the interesting part; show the curve, don't oversell it.
- ❌ No "ship daily," no 🚀, no "revolutionary," no "10x," no buzzword soup.
- ❌ Never claim improvement without the receipt. For Dev that's dishonest; for
  Maya it's the whole brand promise broken.
```