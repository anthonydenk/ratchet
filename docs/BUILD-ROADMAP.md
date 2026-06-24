# Ratchet — Build Roadmap (the game plan)

> The product roadmap (`product/roadmap.md`) says *what* ships in v0→v3 and *why*.
> This doc is the **build plan**: which docs/specs gate each phase, the critical
> path, the seven things that will sink the product if skipped, and a concrete
> first-30-days plan to a v0 that demos. Ambitious but realistic — written for a
> curious vibe coder building mostly solo with AI agents.
>
> The throughline never changes: **capture → distill → prove → promote → ledger.**
> v0 builds the front half; v1 adds the half that makes Ratchet *Ratchet*; v2
> makes it continual; v3 makes it portable.

---

## The one rule that shapes the whole build

**The skill schema is portable from day one, or v3 is impossible.** Everything
downstream — the ledger, the card, the commons — is shaped by the format you
choose for a "skill" *before you write the proof gate*. So the schema
(`architecture/skill-schema.md`) is the first real artifact, even in v0 when
there's no proof gate yet. Get it wrong and you pay for it forever.

---

## Phases mapped to the docs/specs that gate them

Each phase can't be called "done" until its gating docs are real and its exit
criteria (from `product/roadmap.md` and `product/definition-of-done.md`) are met.

### v0 — The hook · *session → clean note in your vault*

**Ships:** `npx ratchet init` → `watch` → a clean, human-readable note in your vault.

**Gating docs/specs (must be settled before/while building):**
- `architecture/skill-schema.md` ⭐ — the `Note` (and skill envelope shape) from day one.
- `architecture/note-format.md` — how notes are written to markdown/Obsidian (managed regions).
- `architecture/overview.md` — the capture→distill pipeline shape.
- `architecture/cli-mcp-interface.md` — `init` / `watch` / `ledger` surface (don't break it later).
- `architecture/config-schema.md` — zero-config defaults; which host agent first.
- `security/privacy.md` + `security/secrets.md` — redaction at distillation; keys from env/keychain.
- `product/definition-of-done.md` — the v0 acceptance bar.
- Repo hygiene: `LICENSE` ✅, `README.md` ✅, `CONTRIBUTING.md` ✅, `SECURITY.md` ✅, CI, issue/PR templates 🔜.

**Exit (from roadmap):** clean machine can init→watch→produce a useful note; notes
validate through the schema and are readable in Obsidian; cold start works; no
secrets/PII written; early users say *"this alone is useful."*

### v1 — The differentiator · *proof gate + regression guard + ledger*

**Ships:** the honesty layer — candidate → proof → promote → ledger → level-up card.

**Gating docs/specs:**
- `architecture/proof-gate.md` ⭐ — held-out check, baseline, significance bar, leakage check, evaluator independence.
- `architecture/ai-considerations.md` ⭐ — the hard-problem decisions made concrete.
- `architecture/ledger-and-card.md` — ledger schema + the shareable card.
- `testing/meta-evals.md` ⭐ + `evals/THRESHOLDS.md` — test the tester; false-promote/false-reject bars.
- `testing/fixtures.md` + `testing/non-determinism.md` — golden good/bad skills; seedable tests.
- `product/success-metrics.md` — the North Star + Trust metrics this phase makes measurable.
- `gtm/*` — landing copy, launch plan, demo + card spec (the launch is v1).
- `legal/risk-and-compliance.md` — disclaimers, license check in CI before public launch.

**Exit (from roadmap):** one agent **provably improves** at a real task, with
receipts; a bad skill is rejected and a regressive one caught; evaluator-
independence violations and manifest-less promotions = **0**; `pnpm eval` green; a
level-up card renders from real ledger data, free of secrets/PII.

### v2 — The magic · *continual self-rewriting (proof-gated)*

**Ships:** the agent refines its own skills unattended — every change still gated.

**Gating docs/specs:**
- `architecture/adr/0004-build-on-continual-harness.md` — now **unblocked**: license
  confirmed MIT (`legal/risk-and-compliance.md` §1); move ADR toward `Accepted`.
- `architecture/proof-gate.md` (extended) — self-rewrites re-proven through the same gate.
- `architecture/config-schema.md` — `maxTrials` / `maxCostUSD` / `maxIterations` strictly honored.
- `security/threat-model.md` — self-rewriting is the attack surface; captured content stays untrusted.

**Exit (from roadmap):** unattended, safe self-refinement; no path bypasses the
gate; budgets/iteration caps provably hold (fail closed at the cap); conflicting
and stale skills detected and resolved/retired in tests.

### v3 — The network · *Verified Experience Commons*

**Ships:** proven skills travel between agents with their proof + provenance.

**Gating docs/specs:**
- `architecture/skill-schema.md` (the `SkillEnvelope`) — pays off the day-one portability bet.
- `security/provenance-signing.md` — verifiable origin + signature checked before anything runs.
- `security/threat-model.md` — the commons as a malware vector; mandatory local re-verification.
- `legal/risk-and-compliance.md` — distribution liability, user-content terms (**[LAWYER]** before ship).

**Exit (from roadmap):** a skill proven on one machine is adopted on another *with*
its proof, re-verified locally before use; tampered/unsigned envelopes rejected;
no imported skill ever auto-promoted.

---

## The critical path

The shortest line of dependencies from nothing to "it demos and it's honest":

```
skill-schema  ─►  capture→distill (v0)  ─►  clean note in vault  ─►  "this alone is useful"
     │                                                                      │
     └──────────────────────────────────────────────────────────────► proof-gate (v1)
                                                                            │
                          regression suite ──────────────────────────────► │
                          meta-evals (test the tester) ───────────────────►│
                                                                            ▼
                                                              ledger + level-up card
                                                                            │
                                                                       LAUNCH (v1)
```

**Reading it:** the schema gates everything. v0 is a straight line to a useful
note. v1's gate **cannot be trusted** until the regression suite *and* the
meta-evals exist — those two are on the critical path even though they feel like
"testing," because without them the proof is faith and the launch has no answer to
the objection. The card is last because it renders real ledger data and is the
viral payload.

**Off the critical path (parallelizable):** GTM copy, ADRs, config niceties,
multi-host-agent support, v2/v3 design. Do them alongside, not before, the line above.

---

## The 7 things that will sink this product (and where each is handled)

From the inventory's "short version" — the vibe-coder-skippable work that is
actually make-or-break *for Ratchet specifically*. Treat these as non-optional.

| # | The sinker | Where it's owned | Phase |
|---|---|---|---|
| 1 | **Skill schema not portable from day one** → no commons ever | `architecture/skill-schema.md` | v0 |
| 2 | **Defining "better" + statistical validity** → you "prove" nonsense | `architecture/proof-gate.md`, `architecture/ai-considerations.md` (C1/C2) | v1 |
| 3 | **Evaluator independence** → the agent games its own grade | `architecture/proof-gate.md`, `AGENTS.md` (invariant) | v1 |
| 4 | **The regression suite** → "never backslides" is a lie without it | `architecture/proof-gate.md`, `testing/test-strategy.md` | v1 |
| 5 | **Meta-evals: testing the prover itself** → test the tester or it's all faith | `testing/meta-evals.md`, `evals/THRESHOLDS.md` | v1 |
| 6 | **Memory-poisoning threat model** → self-learning agents are an attack surface | `security/threat-model.md`, `architecture/ai-considerations.md` (C9) | v1 (design now) |
| 7 | **The demo / level-up card as a real feature** → virality is built, not hoped | `gtm/demo-and-level-up-card.md`, `architecture/ledger-and-card.md` | v1 |

> The pattern: **5 of the 7 are v1.** v0 is the easy, lovable part; v1 is where the
> product is genuinely hard and genuinely defensible. Don't let the v0 dopamine
> pull you past these.

---

## First 30 days — to a v0 that demos

A realistic solo-with-agents plan. Goal at day 30: **a clean machine can
`npx ratchet init` → `watch` → produce a useful note from a real session, and
you've dogfooded it on Ratchet's own development.** No proof gate yet — that's
correct for v0.

**Week 1 — Decide and scaffold (no feature code yet).**
- Lock the **skill/note schema** v1 (`architecture/skill-schema.md`,
  `architecture/note-format.md`) — the one thing you can't cheaply change later.
- Pick the **first host agent** (PRD §9 open question — choose one, e.g. Claude
  Code, and resist spreading thin).
- Scaffold the repo: TS/Node (ADR-0002), CI (lint + test), `@ratchet/schema`
  package, config defaults (`architecture/config-schema.md`).
- Wire **redaction-at-distillation** as a first-class concern from line one
  (`security/privacy.md`, `security/secrets.md`) — retrofitting privacy is painful.

**Week 2 — Capture → distill (the front half).**
- `ratchet init` (zero-config against the chosen host agent + vault).
- `ratchet watch` — background capture of a real session.
- First distillation pass: session → a `Note`. Tune **signal vs. noise** early
  (Inventory C8) — dogfood on your own work and ruthlessly cut junk notes.

**Week 3 — Make the note actually good + write to the vault safely.**
- Notes write only into **managed regions**; never touch the user's own notes.
- Validate notes through `@ratchet/schema`; confirm they're readable/editable in
  Obsidian.
- **Cold start**: a first run with zero skills still produces a useful note
  (Inventory C10) — the first-run-feels-magical bar.
- Start a tiny golden fixture set (`testing/fixtures.md`) so you can tell when
  distillation regresses.

**Week 4 — Dogfood, harden, and prep the build-in-public on-ramp.**
- Run Ratchet on Ratchet's own development for the week; let real use surface the
  rough edges (best QA + best demo at once).
- Verify the **v0 exit criteria** (`product/roadmap.md`): clean-machine init→watch→
  useful note; no secrets/PII in the vault; "this alone is useful" from 2–3 early testers.
- Polish `README` + `CONTRIBUTING` + issue templates; turn on the build-in-public
  posts (`gtm/launch-plan.md` Phase 1). **Do not big-launch yet** — v0 is a soft
  launch; the real launch waits for v1's proof gate.

**What's explicitly NOT in the first 30 days:** the proof gate, regression suite,
ledger, card, self-rewriting, sharing. They're v1+. Shipping a lovable v0 first is
the strategy — each phase is independently useful.

---

## Sequencing principle (keep this on a sticky note)

1. **Schema before features** (portability is a one-way door).
2. **A lovable v0 before the hard v1** (real users + feedback de-risk everything).
3. **The gate is not trusted until the regression suite and meta-evals exist**
   (4 + 5 of the sinkers are on the critical path).
4. **The card/demo is a feature, not an afterthought** (virality is built).
5. **Launch v1, not v0** (the differentiator must be demonstrable to answer
   "isn't this just another memory tool?").

> Build order in one line: **foundations + v0 hook → the honesty layer (v1) →
> continual (v2) → portable (v3).** Each step ships on its own. That's how a repo
> becomes a platform.
