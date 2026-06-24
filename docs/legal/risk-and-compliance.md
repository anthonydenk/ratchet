# Ratchet — Legal Risk & Compliance

> Inventory section I. Dependency license compliance, model-provider ToS, a
> trademark sweep on "Ratchet," and a research-grade / no-warranty disclaimer.
>
> **This document is not legal advice.** It is the maintainer's good-faith,
> engineering-grade risk map to make smart early decisions and to flag where a
> real lawyer is actually needed. Anywhere you see **[LAWYER]**, get qualified
> counsel before relying on it — especially before any commercial offering,
> trademark filing, or the v3 commons (which changes the risk profile materially).

---

## 0. Quick status

| Area | Status | Action |
|---|---|---|
| Ratchet's own license | **MIT** (`/LICENSE`, © 2026 Anthony Denkinger) | Decided. (PRD §9 open question MIT vs Apache resolved to MIT.) |
| `continual-harness` license | **MIT — confirmed compatible** ✅ | Unblocks ADR-0004; see §1. |
| Other deps | Audit required (automated) | §1 — add license-check to CI. |
| Model-provider ToS | Low risk by design; document the distinction | §2. |
| "Ratchet" trademark in software | **Not clear — needs a real sweep** ⚠️ | §3 — **[LAWYER]** before any TM claim. |
| Disclaimer / no-warranty | MIT covers it; add explicit research-grade note | §4. |

---

## 1. Dependency license compliance (Inventory I1)

Ratchet is **MIT**. We may only build on dependencies whose licenses are
compatible with redistributing Ratchet under MIT.

### continual-harness — CONFIRMED

**`github.com/sethkarten/continual-harness` is MIT licensed.**

> Verified at the source (`raw.githubusercontent.com/sethkarten/continual-harness/main/LICENSE`,
> June 2026): "MIT License — Copyright (c) 2026 Seth Karten, Tersoo Upaa Jr, Jake
> Grigsby, Stephanie Milani, Kiran Vodrahalli, Amy Zhang, Fei Fang, Yuke Zhu,
> Chi Jin." Repo: official code for *Continual Harness: Online Adaptation for
> Self-Improving Foundation Agents* (Karten et al., arXiv 2605.09998).

**Conclusion:** MIT → MIT is fully compatible. Ratchet may build on / interoperate
with continual-harness. **This satisfies the gating condition in ADR-0004**, which
was `Proposed` *pending license-compatibility confirmation* — that condition is now
met (recommend moving ADR-0004 toward `Accepted`, noting this verification).

**Obligations to honor (MIT is permissive but not obligation-free):**
- **Preserve their copyright notice and the MIT permission text** for any
  continual-harness code we include, vendor, or substantially derive from. Keep it
  in a `NOTICE` / `THIRD-PARTY-LICENSES` file and in the relevant adapter source.
- **Attribute** continual-harness in the README ("built on the shoulders of"),
  which we already do — keep it accurate as the integration deepens.
- The adapter boundary (ADR-0004: harness behind `packages/providers`, never a
  `core` dependency) also keeps the license surface clean and swappable.

### Everything else — make it automatic

- **Add a license-compliance check to CI** (e.g. an allowlist scanner like
  `license-checker` for npm). Allowlist permissive licenses (MIT, BSD-2/3, ISC,
  Apache-2.0); flag copyleft (GPL/LGPL/AGPL) and anything ambiguous or
  "no-license" for human review **before** merge.
- **Watch for the traps:**
  - **AGPL** anywhere in the dependency tree is a serious issue for a tool others
    run/distribute — treat as a blocker pending review.
  - **Apache-2.0 deps are fine** in an MIT project (one-directional), but ship the
    required `NOTICE` content.
  - **No-license / "all rights reserved"** repos = not usable; default-deny.
  - **Model weights / datasets / eval fixtures** can carry their own (often
    non-software) licenses — fixtures and any bundled data need a license check too,
    not just code deps.
- **Maintain `THIRD-PARTY-LICENSES.md`** generated from the tree, refreshed each
  release. Cheap insurance and a trust signal.

> **[LAWYER]** if any non-permissive (copyleft) license ends up load-bearing, or
> before relicensing/commercializing.

---

## 2. Model-provider Terms of Service (Inventory I2)

The concern: some providers restrict using model **outputs** to "train or improve"
a competing model.

**Ratchet's design makes this low-risk — and the distinction must be documented
clearly:**

- **Ratchet improves the agent's *context*, not a base model.** It distills
  sessions into notes and promotes proven *skills* into the agent's working
  context/prompt. It does **not** fine-tune, train, or produce model weights. There
  is no training pipeline for a foundation model anywhere in Ratchet
  (`product/non-goals.md`: "Not a fine-tuning/training pipeline for base models").
- **The "skills" are prompt/context artifacts**, human-readable markdown the user
  owns — closer to "better notes and instructions for the same model" than to
  "training data for a new model."
- **The user brings their own provider keys**; Ratchet calls the provider on the
  user's behalf, under the user's own ToS relationship. Ratchet is a local tool,
  not a service re-selling model access.

**What to do anyway:**
- **State the distinction plainly** in user-facing docs and this file: *Ratchet
  uses model outputs to improve your agent's context and to verify skills; it does
  not train, fine-tune, or distill a competing foundation model.*
- **Honor each provider's "improve our service / no-train-a-rival" clauses** —
  because we're not training a rival model, we're inside the lines, but keep the
  claim accurate as features evolve (especially if v2 self-rewriting ever touches
  anything model-weight-adjacent — it shouldn't).
- **The proof gate uses provider calls** (N calls per verification). That's ordinary
  API usage under the user's account/budget (`config-schema.md` budgets), not
  training. Document it so it's not misread.
- **[LAWYER]** before any hosted/cloud offering (v0–v2 are local-first per the
  PRD), since hosting changes who holds the ToS relationship and the data.

---

## 3. Trademark sweep on "Ratchet" (Inventory I3)

**Status: not clear — a real sweep is needed before any trademark claim.**

"Ratchet" is a **common English word** (the tool, the mechanism), which cuts both
ways: hard for *anyone* to own broadly, but also means generic/descriptive use is
widespread and a strong software mark may already exist.

**Known collision risks to check (non-exhaustive, and this is exactly where a
human/lawyer search engine beats a guess):**
- **"Ratchet" appears in existing software/products and gaming** (e.g. the
  *Ratchet & Clank* franchise is a well-known entertainment trademark; various dev
  tools and libraries use "ratchet" in their names). None of these is necessarily a
  bar for an open-source AI dev-tool, but **overlap in the relevant class
  (computer software / SaaS, Nice classes 9 & 42) is what matters**, and that needs
  a proper search.

**Recommended actions (in order):**
1. **Clearance search before any TM claim:** USPTO TESS (and equivalents in
   target markets), npm (`ratchet` package name availability — Inventory G4),
   GitHub, domains, and a plain web/app-store sweep. **[LAWYER]** for a real
   clearance opinion if Ratchet ever becomes commercial or you want to file.
2. **Reduce risk now, cheaply:**
   - It's fine to **use** the name for an open-source MIT project under nominative/
     descriptive use without claiming a registered mark — but **do not put ®**
     (only ™ at most, and only if you intend to claim common-law rights).
   - **Disambiguate in metadata**: "Ratchet — verified continual-learning layer for
     AI agents" everywhere, so search and stores don't confuse it with the game or
     unrelated tools.
   - **Secure the handles/domains** you can (Inventory G4) to reduce confusion,
     independent of any registration.
3. **Have a fallback name ready.** The product definition already lists strong
   alternates — **Cairn, Whetstone, Crucible, Compound** (`Product-Definition.md`
   §Names) — in case the sweep surfaces a real conflict in-class. Cheaper to pivot
   pre-launch than post-traction.

> **[LAWYER]** is genuinely warranted here before any registration, ® usage, or
> commercial launch. Trademark is fact- and class-specific; this section is a
> risk flag, not a clearance.

---

## 4. Disclaimers — research-grade, no warranty (Inventory I4)

Ratchet is **early, research-grade, and building in public** (README §Status). The
MIT license already disclaims warranty and liability; we make it explicit and
human-readable so users set expectations correctly.

**Standard disclaimer (use in README, docs site footer, and `SUPPORT.md`):**

> **Ratchet is research-grade software, provided "as is," without warranty of any
> kind.** It is early and evolving; it may have bugs, may change in
> backwards-incompatible ways, and may be wrong. You use it at your own risk. The
> proof gate is designed to make your agent's learning *honest and auditable* — it
> raises the bar, it is not a guarantee of correctness, safety, or fitness for any
> particular purpose. Ratchet runs against AI models whose outputs are
> non-deterministic and can be incorrect; always keep a human in the loop for
> anything that matters. See `LICENSE` (MIT) for the full warranty and liability
> disclaimer.

**Specific clarifications worth stating:**
- **No guarantee of improvement.** "Proven" means "beat baseline on a held-out
  check and passed regression," which is a meaningful, auditable bar — not a
  promise of real-world correctness in every case. Don't oversell it
  (and don't let copy oversell it either — brand voice).
- **AI output disclaimer.** Skills are derived from AI-distilled sessions; users
  are responsible for reviewing what their agent does with promoted skills
  (permission scoping is a parked design area — `security/`).
- **Security/privacy posture, not a promise.** We design for local-first, redaction,
  and a memory-poisoning threat model (`security/threat-model.md`,
  `security/privacy.md`), and we say plainly that no software is perfectly secure;
  report issues via `SECURITY.md`.
- **The v3 commons changes the risk profile.** Sharing skills introduces a malware/
  supply-chain vector (the "ClawHub crisis" reference in the threat model). The
  mandatory local re-verification + provenance/signing are the mitigations, and
  **[LAWYER]** should look at any distribution mechanism before it ships (liability
  for shared content, DMCA-style takedown, terms for a commons).

---

## 5. Where a real lawyer is needed (the honest list)

- **Before any trademark registration or ® use, or commercial launch** (§3).
- **Before any hosted/cloud service** — data handling, provider ToS as an
  intermediary, privacy regulation (GDPR/CCPA) exposure (§2).
- **If any copyleft (GPL/LGPL/AGPL) dependency becomes load-bearing** (§1).
- **Before the v3 Verified Experience Commons ships** — distribution liability,
  user-content terms, takedown process (§4).
- **If Ratchet ever processes others' personal data as a service** (privacy law),
  vs. the current local-first design where the user's data never leaves their machine.

> Until then: MIT license in place, license-check in CI, the model-provider
> distinction documented, the name disambiguated with a fallback ready, and clear
> research-grade disclaimers. That's a responsible early posture — not legal advice,
> but a sound base to build on.

---

## References

- `/LICENSE` (Ratchet, MIT) · `architecture/adr/0004-build-on-continual-harness.md`
- `product/non-goals.md` · `product/PRD.md` (§9 license question) · `Product-Definition.md` (§Names)
- `security/threat-model.md` · `security/privacy.md` · `security/provenance-signing.md`
- continual-harness license: `github.com/sethkarten/continual-harness` (MIT, verified June 2026)
- *Continual Harness*, Karten et al., arXiv 2605.09998 · full list in `research/sources.md`
