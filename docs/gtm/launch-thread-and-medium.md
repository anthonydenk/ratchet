# Ratchet — Launch Thread (X) + Medium Article

> Two assets, one story. The X thread is the spark; the Medium piece is the
> depth. Both in Anthony's voice: curious first, warm, lightly playful, generous
> with credit, never hypey. No "ship daily," no 🚀-as-drumbeat, no "revolutionary,"
> no "10x" (`Anthony-Denkinger-Brand-Kit.md`). The launch line from the product
> definition is the north star for both: *"I gave my AI a memory that has to earn
> its skills."*

---

## Part 1 — X launch thread (ready to post)

> Format notes: ~8–11 tweets. Lead with the feeling, not the architecture. Put
> the demo clip on tweet 1 (autoplay does the work). One emoji per tweet, max —
> the 🔧 and 🎮 are on-brand, everything else is optional. End with the repo and a
> soft ask, not a hard sell.

**1/ (hook + demo clip attached)**
I gave my AI coding agent a memory that has to *earn* its skills.

Not "save notes and hope." It has to **prove** a lesson helps before it keeps it
— and it can never backslide.

Here's two weeks of it leveling up on my actual code. 🧵

> 📎 Attach the 20-second demo (`demo-and-level-up-card.md`). Day 1 it keeps
> screwing up my task; day 14 it nails it; cut to the rising curve.

**2/**
The thing that drives me nuts about AI agents: they have goldfish brain.

I re-explain my whole project every session. They repeat mistakes I already
corrected. They re-break bugs they fixed last week. And I never actually know if
they're getting better — or just vibing.

**3/**
There are a hundred "AI memory" tools now. They all do the same thing: save
notes, retrieve them later, and tell you "trust me, it learned."

But none of them can tell whether a remembered lesson *actually helps*, or stop
new learning from quietly breaking what already worked.

**4/**
So I built the missing piece. I'm calling it **Ratchet** 🔧

A ratchet only turns one way: forward. Your agent's skills should too.

It's a layer on top of the agent you already use — no new model, no new IDE.

**5/**
Here's the honest loop:

→ It captures what you actually did
→ distills it into clean notes in a vault *you own* (Obsidian / markdown)
→ a lesson only becomes a skill if it **beats baseline** AND doesn't break
anything already learned
→ winners get promoted. The rest stay drafts.

**6/**
The easiest way to think about it: **XP for your AI.** 🎮

It earns skills like a skill tree. It has to "beat the boss" to level up — no
cheating, no self-delusion. And it never loses progress it already made.

The hard part isn't *storing* memories. It's proving they're worth keeping.

**7/ (for the researchers in the replies)**
The rigor under the hood: candidates are promoted only past a proof gate with an
**independent evaluator**, a **significance bar** (no promoting lucky runs), and
a **regression check** over every earned skill.

It targets the 3 documented failure modes: self-delusion, noise-as-signal,
catastrophic forgetting.

**8/**
And every promotion ships with a receipt — model, seed, dataset, config hash.
You can re-run the proof. The whole thing is auditable.

Memory becomes *verified skill*. Not vibes.

**9/**
It's MIT, open, and built in public — research-grade and moving fast, so expect
rough edges and tell me what breaks.

Standing on the shoulders of @sethkarten's continual-harness and Obsidian. (Both
made this possible — go look at their work.)

**10/ (CTA)**
```
npx ratchet init
```
Repo + the full proof-gate writeup → [link]

If "my AI never actually gets better" is your frustration too, come build with me.
I want to know what you'd have it learn first. 🔧

> Reply-guy kit (pin these as ready responses):
> - **"Isn't this just another memory tool?"** → "Fair question — that's exactly
>   what I thought the field was missing. Memory tools store notes and ask you to
>   trust it learned. Ratchet adds a proof gate: a lesson isn't kept until it
>   beats baseline AND passes a regression check. You don't get remembered notes,
>   you get earned skills with receipts."
> - **"Can it game its own test?"** → "First thing I designed against — the thing
>   that proposes a skill never grades it, and held-out tasks can't be derived
>   from the training trace. I even test the tester (meta-evals)."
> - **"Where does my data go?"** → "Nowhere you don't control. Local-first, your
>   vault, secrets redacted before anything's written."

---

## Part 2 — Medium article

**Title:** *I gave my AI a memory that has to earn its skills*
**Subtitle:** *Most "AI memory" tools save notes and tell you to trust them. I wanted
proof. Here's two weeks of my agent provably leveling up on my actual code — and
the honesty layer that makes it real.*

**Tags:** AI agents, vibe coding, continual learning, developer tools, open source

> Cadence/voice per `Anthony-Denkinger-Brand-Kit.md` §6: less about me, more
> about an idea worth reading; curious + smart + save-worthy; cross-post to X as
> the thread above.

### Outline

1. **The goldfish problem** (the hook)
   - The four pains, told as a real week of my own work.
   - The honest admission: I'm a vibe coder, not a classically trained dev, and
     the thing that actually drives me nuts is that my AI never gets *better*.

2. **Why every "AI memory" tool left me unsatisfied**
   - They all solve pain #1 (re-explaining your project) and quietly ignore #2–4.
   - The category's blind spot: storing a memory and *proving it helps* are
     completely different problems. Everyone shipped the easy one.

3. **The idea: make it earn the skill**
   - The metaphor that unlocked it: XP for your AI. Skill tree, beat-the-boss,
     no cheating, no backsliding.
   - Name it: a ratchet only turns forward.

4. **The honesty layer (the part that's actually hard)**
   - Capture → distill → **prove** → promote → ledger.
   - The proof gate in plain terms: beat baseline on a held-out check, pass a
     regression check, judged by an evaluator that didn't propose the skill.
   - The three failure modes it's built against: self-delusion, noise-as-signal,
     catastrophic forgetting. (Cite *Not Always Faithful Self-Evolvers*.)
   - Why "test the tester" matters — if you don't meta-eval the gate, the whole
     thing is faith.

5. **The demo: two weeks, with receipts**
   - Embed the 20-second clip and a real level-up card.
   - Walk the curve: what it learned, when, and the proof it actually helped.

6. **What I stood on (credit)**
   - continual-harness (Karten et al.) for the self-rewriting mechanism;
     Obsidian for the transparent, user-owned substrate. Both MIT, both open.
   - My contribution is the one thing nobody built: the proof gate + the
     forward-only guarantee.

7. **Where this goes (three steps ahead)**
   - Once a skill is *proven*, it's portable. The far horizon is a Verified
     Experience Commons — safely adopting a skill another agent proved, with the
     proof traveling with it. Ratchet is the unit; the commons is the network.

8. **Try it / build with me**
   - `npx ratchet init`, the repo, the soft ask: tell me what you'd have it learn.

### Draft intro (ready to publish)

> Last Tuesday I explained my project to my coding agent for what felt like the
> hundredth time. Same stack. Same conventions. The same "no, we don't do it that
> way here" I'd typed out the week before, and the week before that.

> It's a small thing, but it adds up to a strange feeling: I'm working with
> something that's genuinely brilliant for ninety minutes and then has the memory
> of a goldfish. It forgets my project between sessions. It repeats the exact
> mistake I just corrected. Once, memorably, it fixed a bug and then re-broke the
> same bug a week later — confidently, like we'd never met.

> I'm a vibe coder. I didn't come up through CS; I came up through the Air Force,
> logistics, an MBA, and then product, and these days I build real software by
> pairing with AI agents all day. So I have a lot of affection for these tools.
> But the thing that actually nags at me isn't that they make mistakes. It's that
> they don't seem to *learn* — not really. They don't get better at *me*.

> Naturally, I went looking for a fix, and the internet has no shortage of them.
> There's a whole genre now: "give your AI a second brain," "persistent memory
> for your agent," vault-this and memory-that. I tried a bunch. And they're fine!
> They solve the first, most obvious problem — re-explaining your project — by
> saving notes and feeding them back later.

> But every one of them hit the same wall, and it's a wall I couldn't stop
> thinking about. They save a note that says "the user prefers X" and then they
> just… trust it. There's no step where the tool checks whether remembering that
> actually made the agent *better*. No step that separates a real lesson from a
> lucky fluke. And definitely no step that stops a shiny new "lesson" from quietly
> breaking something that was already working.

> Which means they can't honestly answer the question I cared about most: *is my
> agent actually getting smarter, or does it just feel that way?*

> So I built the missing piece. The rule is simple and a little unforgiving:
> **nothing gets into my agent's brain until it proves it helps — and it can never
> backslide.** I'm calling it Ratchet, because a ratchet only turns one way:
> forward. This is the story of how it works, two weeks of it leveling up on my
> actual code, and the one honest idea I think the whole category skipped.

> *(Continue into the article body following the outline above. End on the soft
> ask: it's open, it's MIT, and I genuinely want to know what you'd have your
> agent learn first.)*

---

## Coordination notes (don't publish these)

- **Sequence:** Medium goes live first (so the thread can link to depth). Post the
  X thread within the hour, cross-link both ways.
- **Demo asset** is the load-bearing piece in both — see
  `demo-and-level-up-card.md`. Do not launch either without the clip + a real card.
- **Tie-ins:** the thread/article are G2 in the inventory; they feed Acquisition
  and Virality in `../product/success-metrics.md`. Track inbound from the thread
  with an opt-in referral on `init`.
- **Tone check before posting:** run both past the "mom understands the hook /
  researcher respects the rigor" test. If either fails, rewrite that half.
