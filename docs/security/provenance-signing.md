# Ratchet — Skill Provenance & Signing (v3)

**Status:** Draft v0.1 · Inventory E5 (*design now, ship later*) · Read `skill-schema.md` §6 and
`threat-model.md` §6 (Scenario 3) first.

> ⭐ v3 is the **Verified Experience Commons**: skills that one agent proved, shared with another. A
> commons of "proven" skills is also the perfect malware vector — which is exactly what the **ClawHub
> malicious-skills supply-chain crisis** demonstrated: a popular registry of agent skills was seeded
> with entries that *claimed* impressive proofs but carried planted backdoors, and agents that
> imported on trust were compromised at scale. Ratchet's answer is a hard rule: **a skill from
> outside this machine is untrusted until its proof and provenance are verified, and it is never
> auto-promoted** (AGENTS.md §Security; `skill-schema.md` §6, invariant 5). The hooks are designed
> now even though import ships in v3.

This maps to **OWASP Agentic ASI08 (supply chain & provenance)** and **ASI04 (memory poisoning)** from
the OWASP Top 10 for Agentic Applications (2026).

---

## 1. What a shared skill carries

A shareable skill is **not** just text — it travels as a `SkillEnvelope` (`skill-schema.md` §6):

```ts
interface SkillEnvelope {
  skill: Skill;          // provenance.origin = "imported" on the receiver
  proof: ProofRun;       // the deciding evidence travels WITH the skill
  signature: string;     // signed by the exporter; verified before any use
  ratchetVersion: string;
}
```

Three things must travel together and be checked together:

1. **The skill** — `body`, applicability, and `provenance` (origin, proposerConfigHash, createdBy
   handle — *no PII*, `skill-schema.md` §2).
2. **Its ProofRun** — the receipt: manifest (verifier/baseline model ids, `configHash`, `datasetId`),
   measurement (baseline vs. candidate, trials, significance), and the regression result
   (`skill-schema.md` §4). **Provenance without proof is just a claim.**
3. **A signature** — binding the above to an exporter identity so tampering is detectable.

## 2. Signing & verification

- **Signing.** On export, Ratchet canonicalizes the `{skill, proof, ratchetVersion}` payload
  (stable serialization), hashes it, and signs the hash with the exporter's private key
  (`RATCHET_SIGN_KEY`). The signing key is a **secret** — env/OS keychain only, never in
  config/vault/ledger/logs (`secrets.md` §8).
- **Verification (on import).** Before a SkillEnvelope is touched:
  1. **Signature check** — recompute the canonical hash; verify it against the signature and the
     exporter's public key. A failed/missing signature ⇒ reject the envelope outright.
  2. **Provenance check** — confirm `provenance.origin` is set to `imported`, the exporter identity is
     recorded, and `proposerConfigHash` is present (and that the envelope's own proof still satisfies
     evaluator independence — verifier ≠ proposer).
  3. **Integrity check** — Zod-validate the whole envelope through `@ratchet/schema`; never trust raw
     imported JSON (AGENTS.md §Code style).
- **Trust model (kept honest):** the signature proves *who exported it and that it wasn't altered in
  transit* — it does **not** prove the skill is good or the included proof is real. That is what local
  re-verification is for (§3). Signing answers "is this the bytes they sent?"; the gate answers "does
  this actually help *me*, here?"

## 3. Quarantine, then local re-verification (the non-negotiable rule)

> **An imported skill is `quarantined` until its proof is re-verified locally and its signature
> checked. Never auto-promote imported skills.** (`skill-schema.md` §6, invariant 5; AGENTS.md
> §Security.)

```
import → verify signature & provenance → status: "quarantined"
       → re-run the PROOF GATE LOCALLY (importer's own held-out + regression sets)
            ├─ PASS locally → eligible for promotion (a NEW local ProofRun is written)
            └─ FAIL locally → stays quarantined / retired-on-import (logged, never active)
```

- **The exporter's ProofRun is evidence, not authority.** It tells you what they claim and how; it does
  **not** substitute for the gate. A skill that "passed" on a rigged or non-representative exporter
  dataset will **fail locally** against the importer's real tasks and regression set — which is the
  precise defense against the ClawHub-style "great proof, planted backdoor" envelope.
- **Local re-verification obeys the same invariants** as any promotion: evaluator independence,
  statistical significance, the regression suite, fail-closed, and budgets (`proof-gate.md` §2–§7;
  AGENTS.md invariants 1–3, 6). Promotion still happens **only** through `@ratchet/core/promotion`.
- **A new local ProofRun is written** on re-verification; the imported skill's lineage records both the
  foreign proof (for transparency) and the local one (the one that actually authorizes promotion).
- **Quarantine is a real status** in the schema (`SkillStatus` includes `"quarantined"`) and a ledger
  event (`event: "quarantined"`), so import → quarantine → (promote | retire) is fully auditable
  (`skill-schema.md` §2, §5).

## 4. Threats this addresses (traceability)

| Threat | Defense | Where |
|---|---|---|
| Malicious skill body (planted backdoor) | Local re-verification + regression suite reject it | §3; `proof-gate.md` §4 |
| **Forged proof** ("trust my receipt") | Foreign proof is never authoritative; local gate re-runs | §3 |
| **Tampered envelope** in transit | Signature verification on import | §2 |
| **Spoofed exporter** | Signature bound to exporter key/identity | §2 |
| Auto-promotion of imports | Hard rule: quarantine-first, never auto-promote | §3; invariant 5 |
| Evaluator-independence laundering (exporter graded their own skill) | Independence re-checked locally; verifier ≠ proposer | §2.2; `proof-gate.md` §2 |
| Supply-chain registry compromise (ClawHub) | No envelope is trusted on its claims; every import re-proves locally | whole doc; OWASP ASI08 |

## 5. Open questions (for v3 design)

- **Key distribution / identity:** how exporter public keys are discovered and trusted (web-of-trust,
  a keyserver, sigstore-style transparency log?). Out of scope for the hooks; resolve before commons
  launch.
- **Revocation:** how a compromised exporter key or a discovered-malicious skill is revoked across the
  commons.
- **Envelope versioning:** `ratchetVersion` + `schemaVersion` compatibility across importer/exporter
  (`skill-schema.md` §7 migrations).

These do **not** change the core rule, which holds regardless of how the open questions resolve:
**verify the signature, then re-prove locally before anything is promoted.**

---

## 6. Related docs

`skill-schema.md` §6 · `proof-gate.md` · `../security/threat-model.md` (§6 Scenario 3) ·
`../security/secrets.md` §8 · `../../SECURITY.md` · `AGENTS.md` (§Security, invariant 1) ·
`../product/PRD.md` §6 (v3)
