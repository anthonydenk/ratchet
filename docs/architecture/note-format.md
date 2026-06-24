# Ratchet — Note & Vault Format (markdown / Obsidian)

**Status:** Draft v0.1 · Read `skill-schema.md` and `overview.md` first.

> Distilled knowledge is written as **human-readable markdown** in a **user-owned vault** (Inventory
> B3; ADR-0003). The vault must stay readable and editable by a human in Obsidian or any editor, while
> remaining machine-parseable by Ratchet. Two hard rules govern everything below:
>
> 1. **Ratchet only writes inside Ratchet-managed regions.** A user's own notes are never overwritten
>    (AGENTS.md invariant 8).
> 2. **No secrets/PII ever land in the vault.** Redaction happens at distillation (AGENTS.md
>    invariant 5; `skill-schema.md` §8).

Notes are the `Note` object from `skill-schema.md` §3, serialized to a markdown file. A Note may later
become a candidate `Skill` (`Note.promotedToSkill`), but the Note file itself is just distilled
knowledge — it never carries promotion authority.

---

## 1. Vault layout

```
vault/
├─ notes/                         # distilled Notes (one file per Note)
│  ├─ 2026-06-22-run-migrations-before-tests.md
│  └─ 2026-06-22-prefers-pnpm-over-npm.md
├─ skills/                        # human-readable mirror of PROMOTED skills (read-mostly)
│  └─ run-migrations-before-tests.md
├─ index.md                       # Ratchet-maintained map of notes/skills (managed region)
└─ .ratchet/                      # MANAGED, not user-facing markdown
   ├─ ledger/                     # append-only LedgerEntry records
   ├─ proofs/                     # ProofRun records (receipts)
   ├─ candidates/                 # candidate queue
   ├─ manifests/                  # run manifests (model id, seed, configHash, datasetId)
   ├─ index.sqlite                # speed index; source of truth remains the files
   └─ config.snapshot.json        # resolved+hashed config for the run
```

- `notes/`, `skills/`, and `index.md` are **human-facing markdown** in the vault. The user may add
  their own `.md` files anywhere; Ratchet ignores them except to link.
- `.ratchet/` holds schema-validated managed state (`overview.md` §5). It is not meant for hand-editing.

---

## 2. Note file anatomy

A Note file is **YAML front-matter** (the machine-parseable `Note` fields) followed by **markdown
body** inside Ratchet-managed delimiters, so a user can annotate around it safely.

```markdown
---
# ── Ratchet-managed front-matter (do not hand-edit; mirrors the Note schema) ──
ratchet: note
id: 01J9Z4K7QABCDEF1234567890        # ULID, immutable, never reused
schemaVersion: 0.1.0
title: Run db migrations before tests
kind: gotcha                          # summary | decision | gotcha | preference
sourceSessionId: 01J9Z4J0SESSION0001
createdAt: 2026-06-22T14:03:11Z
vaultPath: notes/2026-06-22-run-migrations-before-tests.md
promotedToSkill: 01J9Z5M2SKILL00001   # set once this Note becomes a candidate Skill (optional)
tags: [testing, database, ci]
links:                                # Obsidian-style backlinks (resolved by Ratchet)
  - "[[prefers-pnpm-over-npm]]"
  - "[[skills/run-migrations-before-tests]]"
---

<!-- ratchet:begin id=01J9Z4K7QABCDEF1234567890 -->
## Run db migrations before tests

The integration suite assumes a migrated schema. Running `pnpm test` against an
un-migrated DB produces confusing "column does not exist" failures that look like
test bugs but are environment drift.

**Lesson:** run `pnpm db:migrate` before `pnpm test` in this repo.

> Source: session 01J9Z4J0… · distilled 2026-06-22 · proposer config `…a3f`
<!-- ratchet:end id=01J9Z4K7QABCDEF1234567890 -->

<!-- Anything OUTSIDE the begin/end block is YOURS. Ratchet never edits below this line. -->
```

### Front-matter field mapping (Note schema → YAML)

| Note field | YAML key | Notes |
|---|---|---|
| `id` | `id` | ULID; the anchor for the managed region. Immutable. |
| `schemaVersion` | `schemaVersion` | Drives migration on read (exit `9` if stale). |
| `title` | `title` | Also the H2 inside the managed block. |
| `kind` | `kind` | `summary\|decision\|gotcha\|preference`. |
| `sourceSessionId` | `sourceSessionId` | Provenance; links to the manifest. |
| `promotedToSkill` | `promotedToSkill` | Optional skill id once distilled into a candidate. |
| `createdAt` | `createdAt` | ISO-8601. |
| `vaultPath` | `vaultPath` | Self-reference; lets the index validate placement. |
| `body` | (region body) | Markdown inside `ratchet:begin/end`. |
| — | `tags`, `links` | Convenience for Obsidian; not authoritative beyond the schema. |

A `ratchet:` discriminator on the first front-matter line marks the file as Ratchet-owned so the
parser never confuses it with a user note.

---

## 3. Ratchet-managed region delimiters (the ownership boundary)

Every byte Ratchet writes into a human-facing markdown file lives between matched HTML-comment
delimiters keyed by the object `id`:

```
<!-- ratchet:begin id=<ULID> -->
… Ratchet-owned content …
<!-- ratchet:end id=<ULID> -->
```

Rules (enforced in `@ratchet/core` and tested):

- **Write only between the markers.** On re-distillation or update, Ratchet replaces *only* the span
  between `begin`/`end` for that `id`. Text before/after is preserved byte-for-byte (AGENTS.md
  invariant 8).
- **Front-matter is managed too**, but only the keys Ratchet owns (the table above). Unknown
  user-added front-matter keys are preserved on rewrite (forward-compat, `skill-schema.md` §7).
- **Missing/!corrupt markers ⇒ fail closed.** If the `end` marker for an `id` is missing, Ratchet
  does **not** guess a boundary; it refuses to write and `ratchet doctor` flags the file. No
  destructive recovery.
- **One region per object id per file.** Duplicate `begin` markers for the same id is a vault-integrity
  error (`doctor` exit `4`).
- A user may freely edit *inside* a region, but those edits are considered transient — they may be
  replaced on the next managed update. Durable user edits belong outside the markers.

---

## 4. The promoted-skill mirror (`skills/`)

When a skill is **promoted** (only via `@ratchet/core/promotion`), Ratchet writes a read-mostly
human-readable mirror under `skills/<slug>.md` so users can see active capabilities in Obsidian. The
authoritative skill object still lives schema-validated; the mirror is a projection.

```markdown
---
ratchet: skill
id: 01J9Z5M2SKILL00001
schemaVersion: 0.1.0
name: Run db migrations before tests
kind: procedure
status: promoted
scope: repo
confidence: 0.91
lastVerdict: pass
lastValidatedAt: 2026-06-22T14:30:02Z
expiresAt: 2026-09-20T14:30:02Z
proofRun: 01J9Z5N4PROOF00001          # the deciding receipt
supersedes: null
links:
  - "[[notes/2026-06-22-run-migrations-before-tests]]"
---

<!-- ratchet:begin id=01J9Z5M2SKILL00001 -->
## Run db migrations before tests  ·  ✅ promoted (confidence 0.91)

**When it fires:** repo scope; before running the test suite.

Run `pnpm db:migrate` before `pnpm test`.

**Proof:** beat baseline +0.18 over 7 trials, CI excludes 0; 0 regressions across 5
prior skills. Receipt: `.ratchet/proofs/01J9Z5N4PROOF00001.json`.
<!-- ratchet:end id=01J9Z5M2SKILL00001 -->
```

The mirror always carries the deciding `proofRun` id and the headline measurement, so the human
sees *why* a skill is active (observability; Inventory C12). Editing the mirror does not change the
skill — promotion/retirement only happen through the gate.

---

## 5. File naming

| Object | Path pattern | Example |
|---|---|---|
| Note | `notes/<YYYY-MM-DD>-<kebab-title>.md` | `notes/2026-06-22-run-migrations-before-tests.md` |
| Skill mirror | `skills/<kebab-name>.md` | `skills/run-migrations-before-tests.md` |
| Index | `index.md` | one per vault |

- **Slug** = lowercased, kebab-cased title/name, ASCII-only, truncated to ~64 chars; collisions get a
  short id suffix (`-01j9z`). The ULID `id` (not the filename) is the durable identity, so renaming a
  file is safe — Ratchet rebinds by the `id` in front-matter, not the path.
- Dates use the Note's `createdAt` (UTC) for stable, sortable ordering.

---

## 6. Linking & the index

- Links use **Obsidian wikilink** syntax (`[[note-or-skill]]`) so graph view and backlinks work
  out of the box. Ratchet resolves links by front-matter `id` first, falling back to path/slug.
- `index.md` is a fully managed file (single big managed region) listing current Notes and promoted
  Skills with status + confidence — a human-readable table of contents that mirrors the SQLite index.
- A Note that became a candidate links to its skill mirror via `promotedToSkill` + a wikilink; the
  skill mirror links back to its source Note(s) via `links`. Lineage (`supersedes`/`parents`) is
  surfaced as links so the human can trace a skill's history (`skill-schema.md` §2 lineage).

---

## 7. Redaction (privacy at the boundary)

Before any Note or mirror is written, distillation runs redaction (config `privacy.redactPII`, default
on). Detected secrets/keys/tokens/PII are removed or replaced with `‹redacted›`; the raw session is
never persisted to the vault, ledger, or logs. A Note that *cannot* be safely redacted is dropped
rather than written. This is a correctness requirement, not best-effort (AGENTS.md invariant 5).

## 8. Related docs
`skill-schema.md` · `overview.md` · `ledger-and-card.md` · `config-schema.md` ·
`adr/0003-markdown-vault-substrate.md` · `../security/threat-model.md`
