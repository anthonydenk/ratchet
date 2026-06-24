# Ratchet — Launch Plan

> Inventory G6. The sequenced plan: pre-launch (build-in-public, waitlist/star),
> launch day (Show HN, Product Hunt, X, subreddits), post-launch — plus what to
> watch, timing tips, and how to kill the "isn't this just another memory tool?"
> objection. Metrics tie directly to `../product/success-metrics.md`.
>
> Guiding principle: Ratchet is **research-grade and building in public**. The
> launch is an *invitation to follow an arc*, not a "we're done, buy it" moment.
> Voice stays curious and honest (`Anthony-Denkinger-Brand-Kit.md`). Don't launch
> a half-built v0 as if it were v1 — launch what's true.

---

## What "launch" means here

A real launch needs the differentiator visible, because the differentiator *is*
the pitch. Soft-launch v0 (the hook) to early followers; do the **big** launch
when **v1's proof gate + ledger + level-up card** can be demonstrated end to end.
That's when the demo and the card exist, and the "just another memory tool"
objection actually has an answer you can show.

- **v0 → soft launch / build-in-public.** Notes-in-your-vault is genuinely useful;
  share it with the people already following along. Gather feedback, not headlines.
- **v1 → the real launch.** Proof gate + regression guard + ledger + the demo +
  the level-up card. This is the Show HN / Product Hunt / press moment.

---

## Phase 1 — Pre-launch (the runway, ~3–6 weeks out)

**Goal:** build an audience that *wants* the thing before it's fully ready, and
make launch day a gathering rather than a cold start.

- **Build in public on X.** 3–5 posts/week in Anthony's voice: what surprised
  him, what broke, a real screenshot of the ledger growing on his own code
  (dogfooding — `../testing/test-strategy.md` dogfooding plan). The honest "this
  broke and here's what I figured out" posts outperform any announcement.
- **The repo is the waitlist.** Make the README the front door, add a clear
  `status: building in public` badge, and **ask for stars** ("star to follow
  along") rather than collecting emails. A GitHub star is the lowest-friction
  "notify me" and it compounds social proof. If you want an email list, a single
  "tell me what you'd have your agent learn" form is enough.
- **Seed the proof-gate idea early.** Post the *concept* — "an AI memory that has
  to earn its skills" — before the product. Let the idea pre-sell. The
  one-of-one framing (everyone solves storage; nobody solves proof) is the whole
  differentiator; plant it now so launch day isn't the first time anyone hears it.
- **Tease the demo.** Drop a 6-second GIF of the curve climbing a week before
  launch. No explanation. Curiosity gap.
- **Line up the assets** (gate on these — don't launch without them):
  - [ ] The 20s demo video + vertical cut (`demo-and-level-up-card.md`)
  - [ ] A real level-up card from real ledger data
  - [ ] Landing page live (`landing-copy.md`)
  - [ ] Launch thread + Medium piece drafted (`launch-thread-and-medium.md`)
  - [ ] `npx ratchet init` works on a clean machine (the #1 launch-day failure mode)
  - [ ] README, CONTRIBUTING, SECURITY, LICENSE, issue/PR templates in place
- **Soft-brief a few friendly builders/researchers.** People who'll genuinely try
  it and reply on launch day. Generosity, not a street team — but a thread with
  zero replies dies, so make sure the first few are real.

**Pre-launch metrics to watch** (`../product/success-metrics.md` §Acquisition):
star growth slope, thread engagement, GIF → repo clickthroughs, early-tester
"this alone is useful" quotes (the v0 bar).

---

## Phase 2 — Launch day (sequenced)

**Pick the day:** **Tuesday–Thursday**, morning **US Pacific** (Show HN and PH
both index on early-day momentum). Avoid Mondays (inbox triage), Fridays/weekends
(low traffic), and major tech-news collision days (big keynotes bury you).

**Run the channels in this order, same day, a couple hours apart so each can feed
the next:**

### 1. Show HN (the anchor — earliest)
- **Title:** `Show HN: Ratchet – an AI agent memory that has to prove it learned`
  (plain, no hype, no emoji in the HN title — HN punishes marketing voice).
- **First comment = the honest backstory:** vibe coder, the goldfish frustration,
  what's actually novel (the proof gate + forward-only), what's *not* done yet,
  and a direct invitation for criticism. HN rewards candor and punishes spin.
- **Be present all day** to answer technically. The researcher persona lives here;
  link `../architecture/proof-gate.md` and `../testing/meta-evals.md` when asked
  "how do you know it works?" Engage the skeptics genuinely — that thread *is* the
  credibility.
- **Lead with the differentiator, not the demo.** HN wants the idea; the curve is
  the dessert.

### 2. Product Hunt
- **Tagline:** "XP for your AI — your agent levels up at your work and earns every
  skill."
- **Gallery:** the 20s demo first, then the level-up card, then the proof-gate
  diagram. Visual-first audience — the card does the heavy lifting here.
- **Maker's comment:** the warm version of the HN backstory; more "look what's
  possible now," less stack-trace. Reply to every comment.

### 3. X launch thread
- Post `launch-thread-and-medium.md` Part 1 with the demo on tweet 1.
- Link the Medium piece (publish Medium ~1 hour earlier so the thread can point to
  depth).
- Reply generously; use the prepared reply-guy kit for the recurring objections.

### 4. Relevant subreddits (read each subreddit's self-promo rules first)
- Likely fits: r/LocalLLaMA, r/ClaudeAI (and host-agent-specific subs), r/ObsidianMD
  (the vault angle), r/artificial, r/SideProject, r/coolgithubprojects.
- **Tailor each post** to the sub's norms — never paste the same blurb five times.
  r/LocalLLaMA wants local-first + the rigor; r/ObsidianMD wants the vault-you-own
  angle; r/SideProject wants the build-in-public story. Lead with value, not the
  pitch; reddit smells marketing instantly.

### Launch-day discipline
- **One person, one voice, all day.** Anthony answers everything personally.
- **Watch `npx ratchet init` like a hawk.** A broken install on launch day is the
  worst possible outcome. Have a fast-patch path ready.
- **Don't argue, clarify.** Every "isn't this just X?" is a chance to land the
  differentiator (see playbook below), not to dunk.

---

## Phase 3 — Post-launch (the week+ after)

**Goal:** convert the spike into a habit and a community, and turn early users
into the viral loop.

- **Reply to every issue and comment** for the first week. Early contributors
  shape the whole thing (`CONTRIBUTING.md`); responsiveness now sets the culture.
- **Ship a visible fix fast.** Take the most common launch-day complaint and fix
  it publicly within days. "You said X, here's X fixed" is the best retention ad.
- **Activate the viral loop.** Nudge happy users to share their level-up card
  (`demo-and-level-up-card.md`). Every share carries `npx ratchet init`. This is
  the engine that makes acquisition compound instead of decay.
- **Set up the community home** (GitHub Discussions to start; Discord if volume
  warrants — `../ops/maintenance.md`). Don't fragment early.
- **Establish a cadence** so followers know what to expect (`../ops/maintenance.md`
  release cadence + `CHANGELOG`).
- **A retro thread** a week or two later: "what I learned launching Ratchet" —
  on-brand, generous, and a second wave of reach.

---

## Metrics to watch (tied to success-metrics.md)

> The honest-measurement product gets honest launch metrics. The trust branch
> matters more than the vanity spike.

| Window | Watch | Source / target |
|---|---|---|
| Launch day | GitHub stars slope, Show HN rank/comments, PH rank, thread engagement | §Acquisition; slope > flat is the first signal of resonance |
| Day 1–7 | `npx ratchet` installs, README→install conversion, install attributable to shares | §Acquisition / §Virality (opt-in init ping) |
| Day 1–7 | **Activation: % of installs earning first proven skill <24h** | §Activation — **the headline number**, target ≥40–60% |
| Day 1–7 | Cold-start success rate (first run produces a useful note) | §Activation, ≥95% — a launch-day reliability check |
| Ongoing | **North Star: proven skills promoted / active user / week** | §North Star, healthy early ~1–3 |
| Week 4 | **Retention: % of cohort still leveling up** | §Retention, target ≥25–35% |
| Ongoing | **Level-up cards shared / week + card→install (K-factor)** | §Virality — is the built loop actually looping? |
| Ongoing | **Trust: meta-eval false-promote rate** | §Trust — release-blocking; a viral launch on a gate that secretly false-promotes is a disaster. Watch this *before* you chase growth. |

**The asymmetry to remember:** a false promote is worse than a slow launch.
Don't trade the trust metric for a spike — the whole brand is "you can believe the
proof."

---

## Timing tips (condensed)

- **Tue–Thu, AM Pacific.** Avoid Mon/Fri/weekends and big-keynote days.
- **Stagger channels** a couple hours apart so each feeds the next; don't blast
  all at once.
- **Publish Medium ~1h before the X thread** so the thread can link depth.
- **Launch v1, not v0.** The differentiator must be demonstrable, or the objection
  below has no answer.
- **Have the maintainer free all day.** Presence beats polish on launch day.
- **Don't fake scarcity or urgency.** Off-brand and unnecessary; the idea sells.

---

## The objection playbook: "Isn't this just another memory tool?"

This will be the **#1 comment** on every channel. It's not an attack — it's the
exact question that lets you land the differentiator. Pre-write the answer; never
wing it.

**The one-liner answer:**
> Memory tools store notes and ask you to *trust* that the agent learned. Ratchet
> adds the part everyone skipped: a **proof gate**. A lesson doesn't become a skill
> until it beats baseline *and* passes a regression check against everything your
> agent already knew. You don't get remembered notes — you get **earned, proven
> skills, on a ledger, with receipts.**

**The three follow-ups and their answers:**
- *"But notes are memory, and memory is learning."* → Storing a memory and proving
  it *helps* are different problems. The whole category shipped the easy one
  (storage) and skipped the hard one (proof). Ratchet is the hard one.
- *"Couldn't a memory tool just add an eval?"* → That's exactly the bet — and the
  hard part isn't bolting on an eval, it's making the eval trustworthy:
  independent evaluator, significance bar, leakage check, and **testing the tester**
  (`../testing/meta-evals.md`). The moat is the rigor, not the feature label.
- *"Show me it's real."* → Here's a level-up card from real ledger data, and here's
  the proof-gate writeup (`../architecture/proof-gate.md`). Every promotion has a
  re-runnable manifest. (This is why the demo + card must exist before launch.)

**The framing that defuses it for vibe coders:** "Other tools give your AI a
notebook. Ratchet gives it XP — it has to *earn* the skill, and it can't backslide.
A notebook is not a skill tree."

**Tone rule:** answer with curiosity, not defensiveness. "Great question, that's
exactly the distinction I obsessed over" beats "no, it's totally different." The
skeptic in the thread is doing your positioning for you.

---

## Pre-launch checklist (one place)

```
[ ] v1 demonstrable end-to-end (proof gate + ledger + card)
[ ] npx ratchet init works on a clean machine
[ ] 20s demo (silent + vertical) + real level-up card rendered
[ ] Landing page live (landing-copy.md)
[ ] Launch thread + Medium drafted (launch-thread-and-medium.md)
[ ] README / CONTRIBUTING / SECURITY / LICENSE / issue+PR templates ready
[ ] Opt-in telemetry + referral tagging wired (maintenance.md)
[ ] Meta-evals green — false-promote within thresholds (don't launch a gate you haven't tested)
[ ] Day picked (Tue–Thu AM Pacific), maintainer free all day
[ ] Objection playbook + reply-guy kit ready
[ ] A few friendly early testers briefed
```
