# Ratchet — Success Metrics & North Star

> What proves Ratchet is working. The whole product is about *honest
> measurement*, so the metrics have to be honest too: we measure **verified
> learning**, not notes stored. A metric that can be gamed by saving more notes
> is the wrong metric.

Targets below are **directional ranges for an early, building-in-public
project**, not contractual SLAs. They exist to tell us "is the loop working?"
and to flag regressions in the product's own honesty (the trust metrics matter
most). Telemetry is **opt-in and privacy-respecting** — local-first means we
instrument lightly and never read vault content.

---

## North Star

> **Proven skills promoted per active user per week.**

This is the one number that captures the entire thesis. It only goes up when:
the capture→distill→prove→promote loop runs, a candidate actually **beats
baseline**, it **passes regression**, and it gets promoted through the gate. You
cannot inflate it by storing more notes — only by *earning* more verified
skills. Memory-tool vanity metrics (notes saved, retrievals) are deliberately
**not** the North Star.

| | |
|---|---|
| **Definition** | Count of `LedgerEntry` events with `event: "promoted"`, per active user, per week. |
| **Measured via** | Append-only ledger; each promotion is backed by a deciding ProofRun manifest. |
| **Active user** | A user who ran `ratchet watch` (captured ≥1 session) in the trailing 7 days. |
| **Healthy early range** | ~1–3 proven skills / active user / week. Below ~0.5 means the loop is stalling (distillation too noisy or the gate too strict). |
| **Honesty guard** | Every counted promotion must have a manifest. No manifest ⇒ not counted (and that's a bug). |

---

## The metrics tree

Five branches under the North Star: **Acquisition → Activation → Retention →
Trust → Virality.** Trust is the unusual one and the most important — it's the
metric that keeps the North Star from being a lie.

### 1. Acquisition — do people find and try it?

| Metric | Target range (early) | How it's measured |
|---|---|---|
| GitHub stars | growth slope > flat; first signal of resonance | GitHub API |
| `npx ratchet` installs | trending up week over week | npm download stats / opt-in CLI ping |
| README → install conversion | qualitative early; watch the drop-off | referral on opt-in init ping |
| Inbound from level-up cards | rising share of new installs | card → repo referral (UTM-style, opt-in) |

> Acquisition is mostly the README + the shared card doing their job. The dual-language hook ("goldfish brain" + "verified continual learning") is the lever here — see `personas.md`.

### 2. Activation — first proven skill in <24h

> The single activation moment that matters: **the agent earns its first proven
> skill.** Not "first note" — first *proof*. That's the "aha" that separates
> Ratchet from every memory tool.

| Metric | Target range (early) | How it's measured |
|---|---|---|
| **% of installs that earn first proven skill within 24h** | **≥ 40–60%** (the headline activation number) | first `promoted` LedgerEntry timestamp − `init` timestamp |
| % that reach first clean note (v0 hook) | ≥ 80% | first `Note` written |
| Time-to-first-note | < a few minutes of active work | capture→distill latency |
| Time-to-first-proof | < 24h of normal work | init → first promotion |
| Cold-start success rate | ≥ 95% | first run produces a useful note with zero skills present |

### 3. Retention — week-4 still leveling

> Retention for Ratchet isn't "did they open the app" — it's "is the agent
> *still earning skills*." A flat ledger is churn even if the CLI still runs.

| Metric | Target range (early) | How it's measured |
|---|---|---|
| **% of users still leveling up at week 4** (≥1 new proven skill in week 4) | **≥ 25–35%** | promotions in the W4 window per cohort |
| Weekly active (ran `watch`) | cohort-dependent; track the curve | trailing-7-day capture |
| Ledger-growth retention (cumulative skills still rising) | majority of W4 retained users | `cumulativeSkills` slope > 0 |
| Skill survival rate (promoted skills not later retired) | high; frequent retirement signals staleness/over-promotion | `retired` vs `promoted` events |

### 4. Trust — the honesty metrics (the ones that matter most)

> If the proof gate isn't trustworthy, every other metric is a lie. These come
> from the **meta-evals** (`pnpm eval`) — testing the prover itself — not from
> user behavior. Thresholds live in `evals/THRESHOLDS.md`; this table is the
> product-level view.

| Metric | Target range | How it's measured |
|---|---|---|
| **Meta-eval false-promote rate** (bad skill wrongly promoted) | **at/below the `evals/THRESHOLDS.md` bar** — the release-blocking number | `pnpm eval` against a labeled good/bad skill set |
| Meta-eval false-reject rate (good skill wrongly rejected) | within threshold; balance against false-promote | `pnpm eval` |
| Regression-catch rate (deliberately-bad skills caught) | ~100% on the regression fixtures | regression suite over labeled forgetting cases |
| Evaluator-independence violations | **0** (release-blocking) | schema/test assertion: verifier hash ≠ proposer hash |
| Promotions missing a manifest | **0** (release-blocking) | ledger audit: every promotion has a ProofRun manifest |
| Proof-gate cost per cycle | within `maxCostUSD`; no runaway | `ProofRun.costUSD` aggregated |

> The asymmetry: a **false promote** is worse than a false reject. Promoting a
> bad skill erodes the entire trust promise; rejecting a good one just slows
> leveling. Tune the gate accordingly, and watch this branch first.

### 5. Virality — the built loop

> Virality is *built, not hoped for* — the level-up card is a feature, not an
> afterthought. The loop: earn skills → card auto-generates → user shares →
> new install.

| Metric | Target range (early) | How it's measured |
|---|---|---|
| **Level-up cards shared / week** | rising; the core viral signal | opt-in card-generation + share events |
| Card → install conversion | track per cohort; optimize the card | referral on opt-in init ping |
| GitHub stars per shared card | a healthy ratio means the card sells | stars cross-referenced with card-share spikes |
| `npx ratchet` installs attributable to shares | growing share of total installs | referral source on init ping |
| K-factor (new users per sharing user) | aim toward ≥ 1 as the loop matures | shares × conversion |

---

## How the branches connect

```
        Acquisition (find it)
              │
              ▼
        Activation (first proven skill <24h)   ← the "aha"
              │
              ▼
        Retention (week-4 still leveling)        ← the habit
              │
              ▼
  ┌──── NORTH STAR: proven skills / active user / week ────┐
  │                                                        │
  ▼                                                        ▼
Trust (meta-eval false-promote rate)            Virality (cards shared)
  the honesty guard — keeps the                   the growth loop — feeds
  North Star from being a lie                      back into Acquisition
```

## Anti-metrics (deliberately not optimized)

| We do **not** chase | Why |
|---|---|
| Notes stored / retrievals | Vanity; the whole point is *proven* skills, not stored memory. |
| Total skills (incl. unproven candidates) | A candidate isn't a result. Only promoted-with-proof counts. |
| Raw session count | Capturing more ≠ learning more. |
| Engagement time in any UI | Ratchet runs in the background; more screen time is not the goal. |

> The one-line version: **proven skills promoted per active user per week** is
> the truth; the **false-promote rate** is what keeps that truth honest.
> Everything else is a tributary.
```