# Ratchet — Demo Video + Level-Up Card Spec

> Virality is **built, not hoped for** (Inventory G3). This is the spec for the
> two viral assets: the 20-second "watch it level up" clip and the auto-generated,
> shareable **level-up card**. The card is a real product feature — it renders
> from real ledger data (`../architecture/ledger-and-card.md`) — not a marketing
> afterthought. Treat both as load-bearing for the launch.
>
> The loop we're engineering (`../product/success-metrics.md` §Virality):
> **earn skills → card auto-generates → user shares → new install.**

---

## Part 1 — The 20-second demo video

### The thesis

**Show, don't explain.** A vibe coder who can't read a stack trace should watch
this and think *"wait, my AI can do THAT? I need it."* The whole arc is one idea:
**day 1 it keeps screwing up your task; day 14 it nails it; cut to the rising
curve.** Anyone who has worked with an AI agent feels the before.

Target length: **20 seconds** (the hard cap; 18–22s acceptable). Designed to
autoplay silently on X — every beat must read with **no audio** (burn in
captions). A 45–60s "director's cut" with voiceover can live on the site/YouTube,
but the 20s silent cut is the one that travels.

### Shot list / script

| # | Time | Visual | On-screen caption | Notes |
|---|---|---|---|---|
| 1 | 0:00–0:03 | Cold open: agent chat. You type a task you do all the time ("set up a new route the way we do it here"). | **"Day 1."** | Real terminal/editor, not a mockup. Keep it yours. |
| 2 | 0:03–0:06 | The agent does it *wrong* — the way it always does. You correct it. A flicker of the familiar sigh. | **"Wrong again. I've corrected this before."** | The relatable pain. Show the correction briefly. |
| 3 | 0:06–0:08 | Quick cut: `npx ratchet watch` running quietly in a side pane. | **"Ratchet's been watching. Learning me."** | Establish it's a background layer, no extra work. |
| 4 | 0:08–0:11 | Snap transition (calendar flip / "14 days later" wipe). Same task typed again. | **"Day 14. Same task."** | The time jump is the drama. Make it crisp. |
| 5 | 0:11–0:14 | The agent nails it — first try, *your* way. No correction needed. | **"It just… got it right."** | Let it breathe for a beat. This is the payoff. |
| 6 | 0:14–0:18 | Cut to the **level-up card**: skill ledger + rising improvement curve animating up. | **"Because it had to *prove* every skill."** | The card is the hero shot. Curve climbs on-screen. |
| 7 | 0:18–0:20 | End card: 🔧 Ratchet wordmark + `npx ratchet init`. | **"XP for your AI. npx ratchet init"** | Clean, calm, one command. |

### Production rules

- **Real over polished.** Use Anthony's actual setup and a real (sanitized) task.
  Authenticity is the brand; a glossy fake undercuts the "honest measurement" thesis.
- **Captions burned in.** Assume sound-off. Caption font readable at phone size.
- **No fake curves.** The curve in shot 6 comes from a real ledger run (or a
  faithful reconstruction of one). The product's whole promise is "no faking the
  proof" — don't fake the proof in the ad.
- **Redaction pass.** No secrets, no client code, no PII on screen. Same bar as
  the card (`../security/privacy.md`).
- **One emoji budget:** 🔧 (and 🎮 if it earns its place). Nothing else.
- **Color/voice:** calm, warm, desert-toned to match the personal brand; the
  energy is "look what's possible now," not hype.

### Variants to cut from the same footage

- **20s silent (X/primary).** The launch asset.
- **9:16 vertical** (Reels / TikTok / Shorts) — same beats, reframed.
- **45–60s director's cut** with voiceover for the site and YouTube — room to
  name the proof gate explicitly for the curious.
- **GIF / 6s loop** of just shots 5–6 (the "got it right" → curve) for embedding
  in the README and replies.

---

## Part 2 — The level-up card (the viral loop, as a feature)

### What it is

An **auto-generated, shareable image** that summarizes your agent's verified
progress — the AI equivalent of a Spotify Wrapped or a streak badge. It renders
from **real ledger data** (`../architecture/ledger-and-card.md`); it is not a
mockup generator. People flex it; the flex is honest because every number is
backed by a proof.

Generated/refreshed by the CLI (e.g. `ratchet card` / surfaced after `ratchet
ledger`), opt-in to share.

### Why it's the viral loop

The screenshot that makes Ratchet go viral is **the skill ledger + improvement
curve**: *"here's my agent getting provably better at my actual work over two
weeks, and here are the notes it wrote to do it."* Other tools can't make this
card honestly — they have no proof to put on it. The card turns Ratchet's hardest,
most differentiated feature (verified proof) into its most *shareable* surface.
That alignment — the moat and the flex are the same thing — is the point.

### What the card shows

| Element | Content | Why it's on the card |
|---|---|---|
| **Headline stat** | "N proven skills earned" (promoted-with-proof only) | The North Star, made visible. Candidates/notes never count. |
| **Improvement curve** | The agent's measured score on your work, over time | The "watch it level up" payoff, frozen into one image. |
| **Skill highlights** | 3–5 named earned skills (human-readable titles) | Concrete and personal: *your* agent learned *your* things. |
| **The streak / cadence** | "Leveling up X weeks running" | Habit/retention signal; gentle social proof. |
| **Proof seal** | A small "✓ verified — every skill beat baseline & passed regression" mark | The honesty badge. This is what no memory tool can copy. |
| **Forward-only motif** | The 🔧 ratchet mark + "never backslides" | Brand + the one-way promise in one glyph. |
| **Attribution** | `🔧 Ratchet · npx ratchet init` | The install on-ramp travels with every share. |

### What the card must NOT show

- **No secrets, no PII, no proprietary code.** Skill titles are sanitized; the
  card runs through the same redaction guard as the vault
  (`../security/privacy.md`, `../security/secrets.md`). A card that leaks is a
  release-blocking bug.
- **No unproven numbers.** Only promoted-with-manifest skills count toward the
  headline stat — the card cannot show a stat the ledger can't back
  (`../product/success-metrics.md` honesty guard).
- **No raw vault content.** Titles and curve only; never note bodies.

### Formats

- **Social share image** — 1200×630 (OG / X / LinkedIn) as the default.
- **Vertical** — 1080×1920 (Stories / Reels) for mobile shares.
- **Square** — 1080×1080 (feed posts).
- **Markdown/README embed** — a smaller static PNG + an auto-generated alt-text
  line so it's accessible and embeddable.
- **OG meta** — when a card has a shareable URL, it sets `og:image` so links
  unfurl into the card itself.

### Built-to-be-shared mechanics

- **Zero-friction generation.** The card appears right after a level-up moment
  ("you earned a new proven skill — here's your card"), the highest-intent
  instant to share.
- **Opt-in share, opt-in telemetry.** Generating a card is local; *sharing* is a
  deliberate user action. Share events (and card→install referral) are counted
  only under opt-in telemetry (`../ops/maintenance.md`).
- **Referral on the install.** The `npx ratchet init` on the card carries an
  opt-in referral tag so card→install conversion and K-factor are measurable
  (`../product/success-metrics.md` §Virality).
- **Honest by construction.** Because the card can only show proven skills, the
  flex *is* the proof. That's the loop: the more honestly your agent leveled up,
  the more there is to share.

---

## Acceptance criteria (so this ships as a feature, not a mock)

- [ ] The card renders from a real `Ledger` (`../architecture/ledger-and-card.md`),
      not hand-authored data.
- [ ] Headline stat counts only `promoted` LedgerEntries that have a ProofRun
      manifest (matches the North Star definition).
- [ ] Redaction guard verified: no secrets/PII/code can appear on a card (tested).
- [ ] All four formats export correctly; OG meta unfurls to the card.
- [ ] The 20s demo exists in silent-caption and vertical cuts before launch day.
- [ ] Share + referral events fire only under opt-in telemetry.

> Tie-back: this doc is Inventory G3 ("the demo/level-up card as a real feature")
> — one of the 7 things that sink the product if skipped. Build it like a feature.
