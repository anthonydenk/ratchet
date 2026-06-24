# Ratchet — Privacy & Data Handling

**Status:** Draft v0.1 · Inventory E3 · Read `skill-schema.md`, `config-schema.md`, and
`threat-model.md` alongside this.

> Your sessions contain your code, your decisions, and sometimes your secrets. Ratchet's design
> answer is simple and is also a **selling point**: **your data never has to leave your machine, and
> what little ever does, you choose.** Knowledge lives as human-readable markdown in *your* vault —
> local-first, user-owned, no required cloud (PRD §4, AGENTS.md §Project overview).

---

## 1. Principles

1. **Local-first by default.** v0–v2 require no hosted service. The vault and `.ratchet/` store live
   on the user's disk (`overview.md` §5).
2. **The vault is user-readable — so it must be clean.** Because anyone (and any synced tool) can read
   it, **no secrets, no API keys, no tokens, no detected PII** may ever be written there or to the
   ledger (AGENTS.md invariant 5; schema invariant 3).
3. **Redact at the source.** Redaction happens *during distillation*, before anything is persisted —
   not as a later scrub.
4. **Data minimization.** Ratchet keeps the distilled *signal* (a decision, a preference, a gotcha),
   not the raw conversation. Most of a session is dropped on purpose (Inventory C8).
5. **User ownership & control.** The user can read, edit, export, and delete everything. Ratchet only
   writes its managed regions (AGENTS.md invariant 8).
6. **Explicit egress.** The only thing that can leave the machine is text sent to a model provider the
   user configured — and that is redacted first. Nothing else phones home; telemetry is opt-in and off
   by default (`config-schema.md` §2, Inventory H1).

---

## 2. What is captured

| Captured | From | Trust | Notes |
|---|---|---|---|
| Session transcript | Host agent adapter (`captureSession()`) | **Untrusted** (`threat-model.md` B1) | The working session: messages, tool calls, outcomes. |
| Tool calls & outputs | Host agent | Untrusted | May include file contents, command output, fetched web text. |
| Outcome signals | Host agent | Untrusted | Pass/fail, errors — used to mine "better" definitions. |

Capture is transient input to the pipeline. **The raw transcript is not a durable artifact** — it is
distilled, and the durable outputs are the sanitized Note/Skill objects.

## 3. What is stored, and where

| Artifact | Location | Readable by user | Contains | Secrets/PII? |
|---|---|---|---|---|
| **Notes** | Vault (markdown, managed regions) | Yes | Distilled decisions/preferences/gotchas | **Never** (redacted) |
| **Skills** | Vault + `.ratchet/` (schema objects) | Yes | Sanitized instruction `body`, applicability, provenance | **Never** (schema invariant 3) |
| **ProofRuns** | `.ratchet/` | Yes | Manifest (model ids, configHash, datasetId), scores, `dissent` | **Never** (manifest is secret-free) |
| **Ledger** | `.ratchet/` (append-only) | Yes | Promotion/retirement events, curve snapshots | **Never** |
| **Config** | `ratchet.config.ts` / env | Yes | Settings; `apiKeyEnv` holds the *name* of a key var, never the key | **Never** (names only) |
| **SQLite index** | `.ratchet/` | (derived) | Fast index over the above; source of truth stays the files | **Never** |
| **Provider keys** | env / OS keychain **only** | — | The actual secrets | Lives **outside** vault/ledger/logs (`secrets.md`) |

Boundaries of writing: Ratchet writes **only** to its managed regions in the vault and to `.ratchet/`.
It never rewrites the user's own notes (AGENTS.md invariant 8).

## 4. Redaction of secrets & PII (at distillation)

Redaction is a hard gate in the distill step, before any persistence (`threat-model.md` §7):

- **Secrets:** API keys, tokens, bearer credentials, private keys, connection strings, passwords.
  Pattern- and entropy-based detection; on detection the value is removed/masked, never stored. (Secret
  *handling* — env/keychain, no-log — is governed by `secrets.md`.)
- **PII:** emails, phone numbers, names beyond a handle, addresses, government IDs, and similar
  identifiers detected in session text. Masked before persistence. `privacy.redactPII` defaults to
  **on** and is surfaced in config purely for audit visibility, not to be turned off lightly
  (`config-schema.md` §2).
- **Provenance keeps a handle, not an identity.** `createdBy` is a user/agent handle — *no PII beyond
  a handle* (`skill-schema.md` §2).
- **Fail-safe:** if a candidate can't be cleanly redacted, it stays a `draft`/`Note` and is not
  promotable — never persisted with secrets "just in case."

> Redaction is best-effort detection, not a guarantee that no sensitive string can ever slip through.
> That is exactly why the vault being user-readable is also a *feature*: the user can see and correct
> what was stored. We pair automated redaction with full transparency rather than claiming perfection.

## 5. What (if anything) leaves the machine — and how the user controls it

| Egress channel | When | What leaves | User control |
|---|---|---|---|
| **Model provider calls** | During distill/prove, if a provider is configured | Redacted prompts (distilled text, task sets) | Choose providers; use a **local** provider; or stay **distill-only** (no verifier ⇒ nothing sent for grading). `config-schema.md` §5 |
| **Telemetry** | Only if explicitly enabled | Aggregate, privacy-respecting metrics | **Opt-in, off by default** (`telemetry.enabled = false`). Inventory H1 |
| **Skill export (v3)** | Only on an explicit export action | A `SkillEnvelope` the user chose to share (skill + proof + signature) | Fully user-initiated; `provenance-signing.md` |
| **Everything else** | — | Nothing | No background sync, no required account, no hidden upload. |

**The strongest privacy posture** — distill-only with a local model — keeps *all* data on the
machine. The trade-off is documented honestly: a remote verifier sees redacted, distilled text. The
choice is the user's, per-provider, in config.

## 6. Retention & deletion

- **Raw sessions:** transient; not a durable artifact (§2). Retain only as long as the pipeline needs
  them for the current cycle.
- **Notes/Skills/ProofRuns/Ledger:** retained in the user's vault/`.ratchet/` until the user deletes
  them. The ledger is append-only by design (it's the integrity record), but the user owns the files.
- **Deletion = delete the files.** Because storage is local markdown + a local store, deletion is the
  user removing vault entries / `.ratchet/` contents. There is no server-side copy to chase.
- **Retired skills** (staleness/decay, `proof-gate.md` §8) are logged as `retired`, never silently
  kept active.
- **Export does not create a remote retention obligation for Ratchet** — once a user shares a
  SkillEnvelope, downstream copies are governed by the commons, not by Ratchet's local store
  (`provenance-signing.md`).

## 7. Privacy as a selling point (positioning)

For the **vibe coder**: *"Your agent learns your project on your machine. Nothing gets uploaded. Your
vault is a folder you own."* For the **researcher**: *"Local-first, redaction at distillation, opt-in
telemetry, auditable storage, and a documented egress surface."* This is a differentiator versus
cloud "AI memory" tools that ingest your conversations server-side (PRD §4; Inventory E3). "You own
it" is a value-prop line, and this document is the proof behind it.

---

## 8. Related docs

`skill-schema.md` · `config-schema.md` · `../security/secrets.md` · `../security/threat-model.md` ·
`../security/provenance-signing.md` · `AGENTS.md` (invariant 5) · `../product/PRD.md` §4
