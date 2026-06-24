# Ratchet — User Stories & Jobs-to-be-Done

> Drives the feature list and the tests. Every story maps to acceptance
> criteria; every learning-path story is **not done** until its meta-eval
> passes (see `definition-of-done.md`). Personas referenced here are defined in
> `personas.md`: **Maya** (the vibe coder, primary) and **Dev** (the serious
> builder / researcher, secondary).

Stories are grouped by release: **v0** (the hook), **v1** (the differentiator),
**v2** (the magic), **v3** (the commons). This mirrors the roadmap in
`roadmap.md` and the release strategy in `PRD.md`.

---

## Jobs-to-be-Done (the underlying jobs)

Stories serve these jobs. JTBD are persona-agnostic; the stories below give each
job a voice.

| # | Job (When… I want… so that…) |
|---|---|
| **J1** | When I start a new session, I want my agent to already know my project, so that I stop re-explaining it every time. |
| **J2** | When I correct my agent, I want that lesson to stick, so that it doesn't repeat the mistake. |
| **J3** | When my agent claims it improved, I want to verify it actually did, so that I'm not trusting vibes. |
| **J4** | When my agent learns something new, I want a guarantee it didn't break something old, so that progress is never lost. |
| **J5** | When I look at my agent over time, I want to see what it learned and the proof, so that I trust it and can show others. |
| **J6** | When my agent refines itself over time, I want every change still gated by proof, so that unattended learning stays safe. |
| **J7** | When someone else's agent proves a useful skill, I want to safely adopt it, so that I don't have to re-earn everything from scratch. |
| **J8** | When I hand Ratchet my conversations, I want my secrets and data to stay mine, so that learning never costs me privacy. |

---

## v0 — The hook (session → clean reusable note)

> Theme: "conversation → clean, reusable knowledge note in your vault."
> Immediately useful on its own. No proof gate yet.

### US-0.1 — One-command setup *(Maya · J1)*
**As a** vibe coder, **I want** to set up Ratchet with a single command against
the agent and vault I already use, **so that** there's zero excuse not to try it.

**Acceptance criteria**
- [ ] `npx ratchet init` detects/asks for the host agent and vault path and writes a valid config.
- [ ] Zero-config defaults work; no required flags for the happy path.
- [ ] Runs on a clean machine (Node ≥ 20) without a global install.
- [ ] Secrets come from env / OS keychain only — never written to config or vault.

### US-0.2 — Capture a working session *(Maya · J1)*
**As a** user, **I want** Ratchet to capture what my agent and I actually did,
**so that** there's raw material to learn from without extra effort.

**Acceptance criteria**
- [ ] `ratchet watch` captures sessions from the host agent in the background.
- [ ] Captured content is treated as **untrusted input** (memory-poisoning vector).
- [ ] No secrets/PII/tokens are persisted from capture; redaction happens before write.

### US-0.3 — Distill a session into a clean note *(Maya · J1, J2)*
**As a** user, **I want** each session distilled into a clean, human-readable
note, **so that** the gold (a decision, preference, gotcha) is kept and the junk
is dropped.

**Acceptance criteria**
- [ ] Output is a `Note` validated through `@ratchet/schema` (kind: summary / decision / gotcha / preference).
- [ ] Note is written as markdown into a Ratchet-managed region of the vault; user's own notes are never rewritten.
- [ ] Note is readable/editable in Obsidian (valid front-matter + body).
- [ ] Distillation redacts detected secrets/PII before anything is written.

### US-0.4 — Own and read my knowledge *(Maya, Dev · J8)*
**As a** user, **I want** all distilled knowledge stored as markdown I own,
**so that** I can read, edit, and trust it — local-first.

**Acceptance criteria**
- [ ] All notes live in the user's vault; nothing required to leave the machine.
- [ ] Files are plain markdown; no proprietary lock-in.
- [ ] Ratchet only edits inside delimited / `.ratchet/` regions.

### US-0.5 — Cold start feels magical, not empty *(Maya · J1)*
**As a** first-time user with zero skills, **I want** the first run to do
something useful, **so that** it feels alive on day one.

**Acceptance criteria**
- [ ] With zero skills present, capture + distill still produce a useful note.
- [ ] First-run output is shown to the user (not silent).
- [ ] No error or empty-state dead-end on a fresh vault.

---

## v1 — The differentiator (proof gate + regression + ledger)

> Theme: the part nobody else built. A lesson becomes a skill only if it proves
> it helps and breaks nothing.

### US-1.1 — Propose a candidate skill *(Maya, Dev · J3)*
**As a** user, **I want** a repeatable-looking note proposed as a *candidate*
skill (not trusted yet), **so that** only real patterns get tested.

**Acceptance criteria**
- [ ] A note that looks like a reusable skill becomes a `Skill` with `status: "candidate"`.
- [ ] Candidate carries applicability conditions (when it should fire) and provenance (proposer config hash).
- [ ] A candidate is never added to active context before passing the gate.

### US-1.2 — Prove a candidate beats baseline *(Dev · J3)*
**As a** serious builder, **I want** a candidate to beat baseline on a held-out
check before it counts, **so that** I'm not keeping flukes.

**Acceptance criteria**
- [ ] Candidate is scored against baseline on a held-out task set; promotion requires a positive, significant delta.
- [ ] Meets the minimum-trials and significance bar from `proof-gate.md`; no promotion on a single lucky run.
- [ ] Held-out tasks are not derivable from the candidate's training trace (leakage check).
- [ ] Every run writes a `ProofRun` with a complete manifest (models, seed, dataset id, config hash).

### US-1.3 — Evaluator independence *(Dev · J3)*
**As a** researcher, **I want** the thing that proposes a skill to never be the
thing that grades it, **so that** the agent can't game its own proof.

**Acceptance criteria**
- [ ] `ProofRun.manifest.verifierConfigHash !== Skill.provenance.proposerConfigHash`, enforced in schema + tests.
- [ ] Proposer and verifier are separate, configurable roles; collapsing them is rejected.

### US-1.4 — Never backslide (regression gate) *(Maya, Dev · J4)*
**As a** user, **I want** a new skill to be promoted only if it breaks nothing I
already earned, **so that** progress is forward-only.

**Acceptance criteria**
- [ ] Promotion runs the full regression suite over all previously earned skills.
- [ ] `regression.regressions` must be empty for a pass.
- [ ] If the regression suite can't run, promotion **fails closed** (candidate is not promoted).
- [ ] A deliberately-bad skill is rejected in tests.

### US-1.5 — Promote winners into active memory *(Maya · J1, J2)*
**As a** user, **I want** proven skills to join my agent's working context,
**so that** next session is measurably better at my work.

**Acceptance criteria**
- [ ] A skill reaches `status: "promoted"` **only** through `@ratchet/core/promotion` (no "force promote").
- [ ] Promoted skills are injected into the host agent's active context.
- [ ] Unproven candidates remain drafts, not active.

### US-1.6 — See the ledger + curve *(Maya, Dev · J5)*
**As a** user, **I want** a visible skill sheet with the proof and an improvement
curve, **so that** I trust it and can show it off.

**Acceptance criteria**
- [ ] `ratchet ledger` renders earned skills, when they were earned, and a link to each deciding ProofRun.
- [ ] The curve plots a benchmark score over time on a stable yardstick task set.
- [ ] Every shown "improvement" is backed by a manifest (no manifest ⇒ not shown).

### US-1.7 — Shareable level-up card *(Maya · J5)*
**As a** vibe coder, **I want** an auto-generated card of skills earned + the
curve, **so that** I can share my agent leveling up.

**Acceptance criteria**
- [ ] Ratchet generates a self-contained "level-up card" artifact from ledger data.
- [ ] The card contains no secrets/PII and no private code.
- [ ] The card reads clearly to someone who has never seen Ratchet.

### US-1.8 — Understand why a skill was promoted or rejected *(Dev · J3, J5)*
**As a** user, **I want** to see *why* a candidate passed or failed, **so that**
I trust the gate instead of treating it as a black box.

**Acceptance criteria**
- [ ] Each decision exposes the measurement (baseline vs. candidate, delta, trials, significance) and, on failure, the strongest objection (`dissent`).
- [ ] The reasoning is reachable from `ratchet ledger` / `ratchet verify`.

### US-1.9 — Trust the prover itself (meta-eval) *(Dev · J3)*
**As a** researcher, **I want** the proof gate measured against a labeled set,
**so that** I know the tester isn't fooling itself.

**Acceptance criteria**
- [ ] `pnpm eval` reports false-promote and false-reject rates against `evals/THRESHOLDS.md`.
- [ ] Any learning-path change is **not done** until its meta-eval is within thresholds.

---

## v2 — The magic (continual self-rewriting)

> Theme: the agent refines its own skills over time — every change still gated
> by proof.

### US-2.1 — Self-refine an existing skill *(Dev · J6)*
**As a** user, **I want** my agent to improve its own skills from new
experience, **so that** capability compounds without my babysitting.

**Acceptance criteria**
- [ ] A self-rewrite produces a new `Skill` version (lineage: `supersedes` + bumped `version`).
- [ ] The rewrite must pass the same proof gate + regression suite as any candidate.
- [ ] `lastVerdict` and `confidence` reflect the most recent ProofRun.

### US-2.2 — Bounded, safe self-improvement loop *(Dev · J6)*
**As a** user, **I want** self-rewriting to honor hard budgets and iteration
caps, **so that** it can never run away.

**Acceptance criteria**
- [ ] Every self-rewrite path honors `maxTrials`, `maxCostUSD`, `maxIterations` from config.
- [ ] No unbounded loops; exceeding a cap stops cleanly and fails closed.
- [ ] Cost per cycle is recorded (`ProofRun.costUSD`).

### US-2.3 — Resolve conflicting skills *(Dev · J4, J6)*
**As a** user, **I want** contradictory skills detected and resolved, **so that**
the agent doesn't act on conflicting guidance.

**Acceptance criteria**
- [ ] Conflicts are detected and recorded (`conflictsWith`).
- [ ] A documented resolution rule decides which skill wins (or quarantines both pending re-proof).

### US-2.4 — Retire stale skills *(Dev · J4)*
**As a** user, **I want** skills that have gone stale to be re-validated or
retired, **so that** the agent doesn't act on what's no longer true.

**Acceptance criteria**
- [ ] Skills carry `expiresAt`; past expiry triggers re-validation.
- [ ] A skill that fails re-validation is `retired` (logged in the ledger), never silently kept.

---

## v3 — The network (Verified Experience Commons)

> Theme: a proven skill is a portable, trustworthy unit. Skills move between
> agents with their proof and provenance attached.

### US-3.1 — Export a proven skill *(Dev · J7)*
**As a** user, **I want** to export a skill with its proof and provenance,
**so that** someone else's agent can adopt it with confidence.

**Acceptance criteria**
- [ ] Export produces a `SkillEnvelope` (skill + deciding ProofRun + signature + ratchetVersion).
- [ ] The envelope contains no secrets/PII.

### US-3.2 — Safely adopt an external skill *(Dev · J7)*
**As a** user, **I want** an imported skill to be untrusted until re-verified
locally, **so that** the commons can't become a malware vector.

**Acceptance criteria**
- [ ] Imported skills land as `quarantined` with `provenance.origin = "imported"`.
- [ ] The signature is checked and the proof **re-verified locally** before any use.
- [ ] Imported skills are **never** auto-promoted.

### US-3.3 — Trust provenance & signing *(Dev · J7)*
**As a** user, **I want** verifiable origin on every shared skill, **so that** I
know where a skill came from and that its proof is real.

**Acceptance criteria**
- [ ] Signature verification is required before re-verification proceeds; a bad signature is rejected.
- [ ] Provenance (origin, source, proposer config hash) travels with the skill and is shown to the user.
```