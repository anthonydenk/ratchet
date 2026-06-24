# Ratchet — Roadmap (v0 → v3)

> Public, so people can follow the arc. Each phase is **independently useful**:
> you get value at v0 even if v1 never shipped. The strategy is to *stand on the
> open shoulders* (Continual Harness, Obsidian) and build the one thing nobody
> else did — the honesty layer — in the middle.

The throughline: **capture → distill → prove → promote → ledger.** v0 builds the
front half (capture → distill → note). v1 adds the half that makes Ratchet
Ratchet (prove → promote → ledger). v2 makes the loop continual. v3 makes the
proven skill portable.

Each phase below: **theme · scope · exit criteria · key risks.** Exit criteria
are the bar to call a phase shipped; they line up with the user stories in
`user-stories.md` and the gates in `definition-of-done.md`.

---

## v0 — The hook · *session → clean note in your vault*

**Theme.** "Conversation → clean, reusable knowledge note in your vault."
Immediately useful, great demo, low risk. This is what gets the first users and
the first feedback. No proof gate yet — and that's fine, because a good note is
already worth having.

**Scope (in).**
- `npx ratchet init` — zero-config setup against the host agent + vault you already use.
- `ratchet watch` — background capture of working sessions from the host agent.
- Distillation: session → a clean, human-readable `Note` (decision / preference / gotcha / summary).
- Markdown / Obsidian vault substrate; notes written only into Ratchet-managed regions.
- Provider/model abstraction and the canonical `@ratchet/schema` (`Note` at minimum) from day one.
- Secret/PII redaction at distillation; secrets from env / keychain only.

**Scope (out for now).** The proof gate, the regression suite, the ledger, the
level-up card, self-rewriting, sharing.

**Exit criteria.**
- [ ] A clean machine can `npx ratchet init` → `watch` → produce a useful note from a real session.
- [ ] Notes validate through `@ratchet/schema` and are readable/editable in Obsidian.
- [ ] Cold start works: zero skills present still produces a useful first note.
- [ ] No secrets/PII written to the vault.
- [ ] Early users say *"this alone is useful."* (the v0 success bar from the PRD)

**Key risks.**
- Distillation keeps junk instead of gold → notes feel like noise. *Mitigation:* tune signal-vs-noise early; dogfood on Ratchet's own development.
- Capture fragility across host agents → pick **one** host agent to support first (open question in the PRD) rather than spreading thin.
- Writing outside managed regions → strict region delimiters; never rewrite the user's own notes.

---

## v1 — The differentiator · *proof gate + regression guard + ledger*

**Theme.** The part nobody else built. A distilled lesson enters as a
*candidate*; it's promoted only if it (a) beats baseline on a held-out check and
(b) passes the regression suite over every earned skill. This is the
two-steps-ahead moment and the unique repo.

**Scope (in).**
- Candidate proposal: a repeatable note becomes a `Skill` (`status: "candidate"`) with applicability + provenance.
- **Proof gate:** held-out check, baseline definition, minimum-trials + significance bar, leakage check.
- **Evaluator independence:** proposer config ≠ verifier config, enforced in schema + tests.
- **Regression suite:** full re-test of earned skills on promotion; **fail-closed** if it can't run.
- Promotion **only** through `@ratchet/core/promotion`; no "force promote."
- `ProofRun` manifests (model, seed, dataset id, config hash) — determinism receipts.
- **Ledger** + improvement curve; `ratchet ledger` / `ratchet verify`.
- The auto-generated **level-up card** (a real feature — the viral loop).
- **Meta-evals** (`pnpm eval`): false-promote / false-reject rates vs. `evals/THRESHOLDS.md`.
- Cost/loop guards (`maxTrials`, `maxCostUSD`, `maxIterations`).

**Exit criteria.**
- [ ] One agent **provably improves** at a real task, with receipts (the v1 success bar).
- [ ] A deliberately-bad skill is rejected; a deliberately-regressive skill is caught.
- [ ] Evaluator-independence violations and manifest-less promotions: **0**.
- [ ] `pnpm eval` green — false-promote / false-reject within thresholds.
- [ ] A level-up card renders from real ledger data, free of secrets/PII.

**Key risks.**
- **"Proves" nonsense** (unrepresentative held-out task) → eval design *is* the product; invest in `proof-gate.md` and golden fixtures.
- **Agent games its own proof** → evaluator independence, asserted in tests.
- **Statistical false positives** (promoting luck) → minimum-trials + significance bar; never promote on one run.
- **Test-set leakage / overfitting the gate** → leakage check; held-out tasks not derivable from the training trace.
- **The tester is untested** → meta-evals are mandatory; "test the tester, or it's all faith."
- **Cost blow-up** → hard budgets and iteration caps on every verification path.

---

## v2 — The magic · *continual self-rewriting (proof-gated)*

**Theme.** The agent refines its own skills over time — every change still gated
by proof. This is where Continual Harness (Karten et al.) gets integrated, moved
from its original domain to real knowledge work, and wrapped in the honesty
layer.

**Scope (in).**
- Self-rewrite: an existing skill produces a new version (`supersedes` + bumped `version`), re-proven through the same gate.
- Bounded loop: `maxTrials` / `maxCostUSD` / `maxIterations` strictly honored; no unbounded loops.
- **Skill conflict resolution:** detect contradictory skills (`conflictsWith`) and resolve or quarantine.
- **Staleness / decay:** `expiresAt` triggers re-validation; failing skills are `retired`, never silently kept.
- Learning-process observability: the user can see *why* every rewrite passed or failed.

**Exit criteria.**
- [ ] The agent refines its own skills **unattended and safely** (the v2 success bar).
- [ ] Every self-rewrite passes the full proof + regression gate; no path bypasses promotion.
- [ ] Budgets/iteration caps provably hold under a loop test (fails closed at the cap).
- [ ] Conflicting and stale skills are detected and resolved/retired in tests.

**Key risks.**
- Runaway self-improvement (cost or infinite loop) → the loop guards are non-negotiable and tested.
- Self-rewriting introduces subtle regressions → the regression suite must scale with the skill set.
- Conflicts silently accumulate → conflict detection is a first-class step, not best-effort.
- Memory poisoning compounds over time → captured content stays untrusted; the gate is the defense, per the threat model.

---

## v3 — The network · *Verified Experience Commons*

**Theme.** Once a skill can be **proven** locally, it becomes a portable,
trustworthy unit. The frontier is exchanging verified skills between people's
agents — a commons where the **proof and provenance travel with the skill.**
This is the part labs can't easily own (it's trust infrastructure, not a model)
and where the network effects live. *Ratchet is the unit; the commons is the
network.*

**Scope (in).**
- **Export envelope:** `SkillEnvelope` = skill + deciding `ProofRun` + signature + ratchetVersion.
- **Provenance & signing:** verifiable origin on every shared skill; signature checked before anything runs.
- **Safe adoption:** imported skills land `quarantined` (`origin: "imported"`), **re-verified locally** before use, **never auto-promoted.**
- A distribution mechanism for envelopes that preserves the local-first guarantee for your own vault.

**Exit criteria.**
- [ ] A skill proven on one machine is adopted on another **with its proof + provenance**, and re-verified locally before use (the v3 success bar).
- [ ] A tampered or unsigned envelope is rejected; a bad signature blocks re-verification.
- [ ] No imported skill is ever auto-promoted; quarantine → local re-proof is enforced in tests.

**Key risks.**
- **The commons as a malware vector** (cf. the "ClawHub crisis" reference) → provenance + signing + mandatory local re-verification; design the hooks now (the schema already carries them).
- Portability debt → the skill format must be portable **from day one** (v0), or v3 is impossible; this is why `skill-schema.md` is the most important spec.
- Trust dilution if re-verification is skipped → re-verification is not optional; imported ≠ trusted.

---

## The arc in one table

| Phase | Theme | Ships | Success = | Biggest risk |
|---|---|---|---|---|
| **v0** | The hook | session → clean note | "this alone is useful" | distillation keeps junk |
| **v1** | The differentiator | proof gate + regression + ledger | one agent provably improves, with receipts | "proving" nonsense / gaming the gate |
| **v2** | The magic | continual self-rewriting, proof-gated | agent refines its own skills, safely | runaway loops / silent regressions |
| **v3** | The network | Verified Experience Commons | proven skills travel with proof + provenance | the commons as a malware vector |

> Build order in practice: foundations and the v0 hook first (low risk, real
> users), then the honesty layer in v1 (the unique IP and the thing worth
> writing about), then make it continual (v2), then make it portable (v3). Each
> step is shippable on its own — that's how a repo becomes a platform.
```