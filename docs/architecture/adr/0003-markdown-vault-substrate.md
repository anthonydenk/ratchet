# ADR-0003: Markdown / Obsidian as the knowledge substrate

- **Status:** Accepted
- **Date:** 2026-06-22
- **Deciders:** Ratchet maintainers
- **Supersedes:** —

## Context

Ratchet's distilled knowledge — Notes and the human-readable mirror of promoted Skills — has to live
somewhere. The PRD makes ownership a core value proposition (§4): *"You own it — knowledge lives in
readable markdown in your vault, local-first."* The personas reinforce it: the vibe coder wants to
*see* their agent's knowledge without a tool; the researcher wants it auditable.

The candidate substrates were:
1. A **database** (SQLite/embedded, or a hosted store) as the primary, human-readable views generated on
   demand.
2. **Plain markdown files in a user-owned vault** (Obsidian-compatible), with a lightweight index for
   speed.

A key constraint comes from the schema doc: **v3 (the Verified Experience Commons) requires portable
skills from day one** (`skill-schema.md`). The substrate must not lock knowledge into an opaque store.

Note: this is about the **knowledge substrate** (Notes + skill mirrors that humans read). Ratchet still
uses a SQLite index under `.ratchet/` purely as a *speed cache*; the files remain the source of truth
(`overview.md` §5). This ADR is not "no database anywhere" — it's "markdown is canonical for knowledge."

## Decision

Use **plain markdown files in a user-owned vault, Obsidian-compatible**, as the canonical substrate for
human-readable knowledge. The schema-validated objects serialize to markdown with YAML front-matter
inside Ratchet-managed region delimiters (`note-format.md`). A SQLite index (`better-sqlite3`) is a
derived, rebuildable cache — never the source of truth.

## Consequences

**Positive**
- **Transparency:** users read and audit their agent's knowledge in any editor — the proof of "what it
  learned" is right there, which is the whole trust pitch (PRD §2).
- **Ownership & local-first:** no cloud dependency, nothing leaves the machine (privacy is also a
  selling point, Inventory E3). The user can back it up, version it in git, or open it in Obsidian.
- **Portability for the commons:** markdown + front-matter + the `SkillEnvelope` (`skill-schema.md` §6)
  makes skills portable from day one, which is the precondition for v3.
- **Graph/backlinks for free** via Obsidian wikilinks, so lineage and conflicts are navigable
  (`note-format.md` §6).
- **Diff-friendly:** changes show up in plain text diffs, reinforcing observability (Inventory C12).

**Negative / costs**
- Markdown is not a transactional store; concurrent writes and integrity need care. Mitigated by the
  managed-region delimiters (write only between markers, fail closed on corruption — `note-format.md`
  §3) and the SQLite index for querying.
- Parsing human-edited markdown is fragile. Mitigated by Zod-validating on read, the `ratchet:`
  discriminator, and refusing destructive recovery when markers are missing.
- Query performance over many files would be poor without the index; hence the SQLite cache (a
  deliberate, derived exception, not a return to a DB-of-record).

**Revisit if:** scale or multi-writer concurrency makes file-based canonical storage untenable — that
would be a superseding ADR, and would still need to preserve export/portability.

## Related
`0001-record-architecture-decisions.md` · `note-format.md` · `skill-schema.md` · `../overview.md`
