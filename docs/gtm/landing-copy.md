# Ratchet — Landing Page Copy

> Drop-in copy for the marketing site. Two languages, one page: a plain hook for
> the vibe coder who can't read a stack trace, and rigor underneath for the
> researcher who needs to respect it (`../product/personas.md`). Voice: curious,
> warm, lightly playful — never hypey. No "ship daily," no 🚀, no "revolutionary,"
> no "10x" (`Anthony-Denkinger-Brand-Kit.md` voice rules).
>
> Section order is the recommended page order. Each `## H2` is a page section.
> CTAs are marked **[CTA]**. Microcopy is in *italics*.

---

## Hero

### Your AI coding agent has goldfish brain.

# Ratchet gives it a memory that levels up at *your* work — and proves it's actually getting smarter.

*A ratchet only turns one way: forward. Your agent's skills should too.*

**[CTA primary]** `npx ratchet init` — *copy the command*
**[CTA secondary]** Star on GitHub →
**[CTA tertiary, quiet]** Watch the 20-second demo ↓

> Hero visual: the **level-up card** — a real skill ledger with a rising
> improvement curve. The screenshot *is* the pitch (`../architecture/ledger-and-card.md`).

---

## The problem (you've felt all four of these)

> The 4 pains, in the user's own words. This is the emotional core — keep it plain.

1. **You re-explain your whole project every. single. session.**
   Your agent has no memory of who you are or how you work.

2. **It keeps making the mistake you already corrected.**
   Yesterday's lesson is gone today.

3. **It fixed the bug, then re-broke it next week.**
   No memory of what was already true.

4. **You never know if it's *actually* getting better — or just vibing.**

Every "AI memory" tool out there tries to fix #1. None of them honestly fix
#2–4, because they all just save notes and *say* "trust me, it learned."

**Ratchet is different: nothing gets into your agent's brain until it proves it
helps — and it can never backslide.**

---

## The one-liner

> **XP for your AI.** Your agent levels up at your work, earns skills like a skill
> tree, has to "beat the boss" to level up (no cheating) — and never loses
> progress it already made.

---

## How it works (in plain language)

Ratchet sits on top of the AI agent you already use. As you work, it runs one
honest loop: **capture → distill → prove → promote → ledger.**

1. **Captures** what you and your agent actually did.
2. **Distills** each session into clean, human-readable notes in a vault *you own*
   (Obsidian / plain markdown). You can open them, read them, edit them. They're yours.
3. **Proves** — before any lesson becomes a real skill, it has to beat your
   agent's current baseline on a quick check, *and* not break anything it
   already knew.
4. **Promotes** the winners into your agent's working memory. The rest stay drafts.
5. **Ledger** — you watch your agent **level up** on a visible skill sheet, with
   the receipts.

*No new model. No new agent. No rebuilding your setup. Ratchet is a layer, not a
replacement.*

**[CTA]** See a real ledger →

---

## The differentiator — the proof gate

> This is the whole product. Lead with it everywhere (`PRD.md` §8: "Just another
> memory tool" perception → lead with proof; the ledger is the proof).

The hard, valuable part isn't *storing* memories — it's **deciding what's
actually worth keeping, and proving it works.**

| Other "AI memory" tools | 🔧 Ratchet |
|---|---|
| Save notes, retrieve later | Save notes **and prove they help** |
| "Trust me, it learned" | "Here's the proof it learned" |
| Silently forgets / re-breaks things | Forward-only — old skills are protected |
| Memory you *retrieve* | Skills your agent *earned*, on a ledger |

A lesson only becomes a skill if it **(a)** beats baseline on a held-out check
and **(b)** passes a regression check against every skill your agent already
earned. No proof → it stays a draft. The ratchet only turns forward.

---

## For the curious (the rigor)

> The researcher's paragraph. Same page, different register. This is where the
> README body voice lives (`README.md`, `../product/personas.md` secondary ICP).

Ratchet is an honest **continual-learning loop** for agents. Distilled lessons
enter as *candidates*; a candidate is only promoted if it outperforms baseline
on a held-out check **and** passes regression checks against every previously
earned skill — with an **independent evaluator** (the thing that proposes a
skill never grades it), a **statistical significance bar** (never promote on one
lucky run), and a **leakage check** (held-out tasks aren't derivable from the
training trace).

This directly targets the three documented failure modes of self-improving
agents:

- **Self-delusion** — agents believing they improved when they didn't.
- **Noise-as-signal** — keeping lucky flukes.
- **Catastrophic forgetting** — new learning silently degrading old capability.

Memory becomes *verified skill*, with an auditable trail. Every promotion carries
a manifest (model, seed, dataset id, config hash) — a determinism receipt you
can re-run. It's model- and agent-agnostic, local-first, and your knowledge
lives in markdown you can read, edit, and own.

> Background: *LLM Agents Are Not Always Faithful Self-Evolvers* (arXiv
> 2601.22436); Continual Harness (Karten et al., arXiv 2605.09998); OWASP Top 10
> for Agentic Applications (2026). Full list: `../research/sources.md`.

**[CTA]** Read the proof-gate design → *(links to `../architecture/proof-gate.md`)*

---

## Quickstart

```bash
# point it at the agent + vault you already use
npx ratchet init

# work like you normally do — Ratchet learns in the background
npx ratchet watch

# see what your agent has actually learned (with proof)
npx ratchet ledger
```

That's it. Zero config = zero excuse.

---

## Your data stays yours

> Privacy is a selling point, not fine print (`../security/privacy.md`).

- **Local-first.** Your conversations and your vault stay on your machine.
- **Secrets and PII are redacted** at distillation — never written to the vault,
  never logged.
- **API keys** come from your environment or keychain, nowhere else.
- **Telemetry is opt-in** and never reads your vault content. We measure whether
  the *loop* is working, not what you're working on (`../ops/maintenance.md`).

---

## Status

🚧 **Early and building in public.** This is research-grade and moving fast.
Expect rough edges, share what breaks, and watch it improve (it'd be embarrassing
if this project didn't). Star it to follow along.

**[CTA]** Star on GitHub → · Follow [@anthonydenk](https://x.com/anthonydenk)

---

## The roadmap (so you can follow the arc)

- **v0 — the hook.** Conversation → clean, reusable knowledge notes in your vault.
- **v1 — the differentiator.** The proof gate + regression guard + skill ledger
  *(the part nobody else has built)*.
- **v2 — the magic.** Continual self-rewriting: the agent refines its own skills
  over time, every change gated by proof.
- **v3 — the network.** A **Verified Experience Commons**: safely adopt skills
  another agent *proved*, with the proof and provenance traveling along.

Full roadmap: `../product/roadmap.md`.

---

## FAQ

**Is this just another memory tool?**
No — and that's the whole point. Memory tools store notes and ask you to trust
that the agent "learned." Ratchet adds the part everyone skipped: a **proof
gate**. A lesson doesn't become a skill until it beats baseline *and* passes a
regression check against everything your agent already knew. You don't get
remembered notes; you get **earned, proven skills on a ledger.**

**Do I have to switch agents or models?**
No. Ratchet is a layer that drops onto the agent you already run (Claude Code,
Codex, OpenCode, and more over time). No new model, no new IDE.

**Where does my data go?**
Nowhere you don't control. It's local-first. Notes live in markdown in *your*
vault. Secrets and PII are redacted before anything is written. Telemetry is
opt-in and never reads vault content.

**What does "prove" actually mean?**
A candidate skill has to outperform your agent's current baseline on a small
held-out check, judged by an **independent evaluator**, across **enough trials**
to clear a significance bar — and it must not regress any skill already earned.
No proof, no promotion. Details: `../architecture/proof-gate.md`.

**Can the agent cheat its own test?**
That's the first thing we designed against. The component that *proposes* a skill
is never the one that *grades* it (evaluator independence), and held-out tasks
can't be derived from the training trace (leakage check). We even **test the
tester** — meta-evals measure how often the gate wrongly promotes or rejects
(`../testing/meta-evals.md`).

**What if a skill goes stale — an API changes, my preference changes?**
Skills can expire and get re-validated; ones that no longer hold are retired, not
silently kept. Forward-only doesn't mean "never let go of what's wrong" — it
means "never lose what's still proven."

**Is it free / open source?**
Yes. MIT licensed, open, and built in public.

**Who's building it?**
Anthony Denkinger — a curious product builder and vibe coder, building the thing
he wanted: an agent that learns *you* and can prove it.
[@anthonydenk](https://x.com/anthonydenk) · [anthonydenkinger.com](https://www.anthonydenkinger.com/).

---

## Closing CTA

### Give your AI a memory that has to earn its skills.

```bash
npx ratchet init
```

**[CTA primary]** Get started · **[CTA secondary]** Star on GitHub · **[CTA tertiary]** Read the docs

*Built on the shoulders of [`continual-harness`](https://github.com/sethkarten/continual-harness)
(Karten et al.) and [Obsidian](https://obsidian.md). MIT licensed.*
