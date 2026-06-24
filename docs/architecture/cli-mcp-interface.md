# Ratchet — CLI + MCP Interface Spec (the public API)

**Status:** Draft v0.1 · Read `overview.md`, `skill-schema.md`, and `proof-gate.md` first.

> This is the contract the outside world sees: the `ratchet` CLI a human runs, and the MCP tool
> surface a host agent calls. **Breaking either later hurts** (Inventory B6), so this doc marks
> precisely what exists in **v0** vs. **later** and pins the names, flags, params, returns, and exit
> codes. Anything that mutates the active skill set still goes through the proof gate — these
> surfaces never offer a "force promote" (AGENTS.md invariant 1).

---

## 0. Conventions

- **Distribution:** `npx ratchet <cmd>` (no global install required); also installable as a dev
  dependency exposing the `ratchet` bin. Built with `commander` (see ADR-0002).
- **Config resolution:** every command resolves config with precedence **flags > env > file >
  defaults** (see `config-schema.md`). Global flags below are honored by all commands.
- **Output modes:** human-readable by default; `--json` emits a single schema-stable JSON object on
  stdout (for scripting and the MCP layer). Logs/diagnostics go to **stderr**, never stdout, so
  `--json` stdout stays clean.
- **Determinism receipts:** any command that runs the gate prints/returns the ProofRun manifest
  (AGENTS.md invariant 7). No "improvement" is ever reported without a manifest.
- **Fail-closed:** on uncertainty in a proof/promotion path, the command exits non-zero and promotes
  nothing.

### Global flags (all commands)

| Flag | Type | Default | Meaning |
|---|---|---|---|
| `--vault <path>` | path | from config | Override vault path. |
| `--config <path>` | path | `./ratchet.config.{ts,js,json}` | Explicit config file. |
| `--json` | bool | false | Machine-readable output on stdout. |
| `--quiet`, `-q` | bool | false | Suppress non-error stderr chatter. |
| `--verbose`, `-v` | count | 0 | `-v`/`-vv` increase diagnostic detail (stderr). |
| `--no-color` | bool | false | Disable ANSI color. |
| `--dry-run` | bool | false | Plan only; perform no writes / no promotions. |
| `--yes`, `-y` | bool | false | Assume "yes" to confirmation prompts (CI). |

### Exit codes (stable across all commands)

| Code | Name | Meaning |
|---|---|---|
| `0` | `OK` | Success (including "nothing to do"). |
| `1` | `GENERIC_ERROR` | Unexpected/uncaught error. |
| `2` | `USAGE_ERROR` | Bad flags/args (commander-level). |
| `3` | `CONFIG_INVALID` | Config failed Zod validation or proposer == verifier. |
| `4` | `VAULT_ERROR` | Vault missing, unreadable, or not Ratchet-initialized. |
| `5` | `PROOF_FAILED` | Gate ran and returned a `fail` verdict (not an error — a result). |
| `6` | `REGRESSION_DETECTED` | A promotion attempt regressed a prior skill (fail-closed). |
| `7` | `BUDGET_EXCEEDED` | `maxTrials`/`maxCostUSD`/`maxIterations` hit; failed closed. |
| `8` | `PROVIDER_ERROR` | Model/host-agent adapter error (auth, network, rate limit). |
| `9` | `SCHEMA_MIGRATION_REQUIRED` | Vault/ledger objects need a migration (`packages/schema/migrations`). |

> Codes `5`/`6`/`7` are **expected outcomes**, not crashes. Scripts should treat them as
> "the gate did its job," distinct from `1`/`8` infrastructure failures.

---

## 1. Command summary (v0 vs. later)

| Command | Purpose | Status |
|---|---|---|
| `ratchet init` | Scaffold vault + `.ratchet/` + config. | **v0** |
| `ratchet watch` | Watch host-agent sessions; capture → distill → prove → promote. | **v0** for `--input`; `--prove` runs the full gate |
| `ratchet demo` | Deterministic offline transcript → earned skill demo. | **v0** |
| `ratchet ledger` | Show earned skills, curve, and render the level-up card. | **v0** |
| `ratchet verify` | Manually run the proof gate on a candidate (or re-validate). | **v1** |
| `ratchet doctor` | Diagnose config, providers, vault integrity, evaluator independence. | **v0** |
| `ratchet export` | Emit a portable `SkillEnvelope` (skill + proof + signature). | **later (v3)**; stub in v0 |
| `ratchet import` | Ingest a `SkillEnvelope` as `quarantined` (never auto-promote). | **later (v3)**; stub in v0 |

---

## 2. `ratchet init` — scaffold a vault  *(v0)*

Creates the user-owned vault and the managed `.ratchet/` directory, writes a starter
`ratchet.config.ts` and `.env.example`, and validates the result.

```
ratchet init [path] [flags]
```

| Flag | Default | Meaning |
|---|---|---|
| `--vault <path>` | `./vault` (or `[path]`) | Where the markdown vault lives. |
| `--host <id>` | prompt | Host agent adapter (e.g. `claude-code`, `codex`, `opencode`). |
| `--obsidian` | false | Write an Obsidian-friendly layout + `.obsidian` hints. |
| `--force` | false | Re-scaffold over an existing dir (managed regions only; never user notes). |

**Writes:** `<vault>/` with Ratchet-managed regions, `<vault>/.ratchet/` (ledger, ProofRuns,
candidate queue, manifests, SQLite index), `ratchet.config.ts`, `.env.example`. Never overwrites
user notes (AGENTS.md invariant 8).

**Example**
```bash
npx ratchet init ./my-vault --host claude-code --obsidian
```

**Exit:** `0` on success; `4` if target exists and `--force` not given; `3` if generated config
fails validation.

---

## 3. `ratchet watch` — the learning loop

Watches for completed host-agent sessions and runs the pipeline. Without `--prove` it stops after
**distill** (Notes + candidate Skills written, nothing promoted). With `--prove` it runs the full
**prove → promote → ledger** path, honoring all budgets.

```
ratchet watch [flags]
```

| Flag | Default | Meaning |
|---|---|---|
| `--once` | false | Process the most recent session and exit (don't stay resident). |
| `--since <when>` | last run | Backfill sessions since a time/cursor. |
| `--distill-only` | false | Stop after distillation; never invoke the gate. |
| `--prove` | false | Run the proof gate on candidates and promote on `pass`. |
| `--max-cost-usd <n>` | config | Per-run cost ceiling (overrides config budget). |
| `--max-trials <n>` | config | Per-evaluation trial cap. |
| `--max-iterations <n>` | config | Self-rewrite iteration cap (v2). |
| `--no-promote` | false | Run the gate and report verdicts, but do not write promotions. |

**Behavior (one cycle):** capture (untrusted) → distill (sanitize + Zod-validate) → for each
candidate, prove (baseline vs. candidate, ≥`minTrials`, significance, regression suite) → promote
**only on `pass`** via `@ratchet/core/promotion` → append ledger → update curve. Budgets enforced
throughout; failure to run the regression suite **fails closed** (exit `6`/`7`).

**Example**
```bash
# v0: keep a clean note vault, no promotions
npx ratchet watch --distill-only

# v1: full loop with a tighter budget, in CI
npx ratchet watch --once --prove --max-cost-usd 0.50 --json
```

**`--json` return (per processed session):**
```json
{
  "sessionId": "01J...",
  "notes": [{ "id": "01J...", "vaultPath": "notes/2026-06-22-...md" }],
  "candidates": [{ "id": "01J...", "name": "Run db migrations before tests", "status": "candidate" }],
  "proofRuns": [{ "id": "01J...", "skillId": "01J...", "verdict": "pass", "delta": 0.18, "trials": 7 }],
  "promoted": ["01J..."],
  "costUSD": 0.31
}
```

**Exit:** `0` (incl. nothing learned); `5` if a candidate was evaluated and failed (when `--once`);
`6` regression; `7` budget; `8` provider error.

---

## 4. `ratchet demo` — deterministic offline loop

Runs a built-in transcript through the deterministic fake provider and proof evaluator. This command
is the reproducible demo/gif path: it costs nothing, makes no live-model calls, and always earns the
same proof-backed skill unless the proof gate regresses.

```bash
npx ratchet demo
npx ratchet ledger --card
```

**Behavior:** capture fixture → distill Note + candidate Skill → proof gate with deterministic
baseline/verifier → promote through `@ratchet/core/promotion` → append ledger.

**Exit:** `0` on earned skill; `5` if the gate fails closed.

## 5. `ratchet ledger` — earned skills, curve, card

Reads the append-only ledger and renders progress. This is the trust surface and the seed of the
viral artifact (see `ledger-and-card.md`).

```
ratchet ledger [flags]
```

| Flag | Applies to | Default | Meaning |
|---|---|---|---|
| `--card` | card | false | Generate the shareable level-up card instead of listing the ledger. |
| `--format <f>` | card | `svg` | `svg\|md` (see `ledger-and-card.md`). |
| `--out <path>` | card | `<vault>/.ratchet/cards/ratchet-card.svg` | Output file for the card. |

**Example**
```bash
npx ratchet ledger
npx ratchet ledger --card --format svg --out ./card.svg
```

**`--json` return (`list`):** array of `{ skillId, name, status, lastVerdict, confidence,
promotedAt, cumulativeSkills, benchmarkScore }` (fields trace to `LedgerEntry` + `Skill.trust`).

**Exit:** `0`; `4` if no ledger; `9` if entries need migration.

---

## 6. `ratchet verify` — run the gate manually  *(v1)*

Runs the proof gate on a named candidate, or re-validates a skill whose `expiresAt` has passed.
Same code path as `watch --prove`; this is the human-in-the-loop entry point and the one used in
docs/demos.

```
ratchet verify <skillId|candidateId> [flags]
```

| Flag | Default | Meaning |
|---|---|---|
| `--revalidate` | false | Re-run the gate for staleness (may `retire` on fail). |
| `--trials <n>` | config `minTrials` | Override trial count (≥ `minTrials`). |
| `--verifier <id>` | config | Force a verifier provider/config (must differ from proposer). |
| `--prosecutor` | config | Enable the adversarial verifier and record `dissent`. |
| `--explain` | false | Print the full reasoning trace (why pass/fail) for observability. |

**Guards:** refuses to run if `verifierConfigHash == proposerConfigHash` (exit `3`); refuses to
promote on regression (exit `6`) or budget breach (exit `7`).

**Example**
```bash
npx ratchet verify 01JABC... --prosecutor --explain
```

**`--json` return:** a full `ProofRun` object (verdict, manifest, measurement, regression, dissent,
costUSD) per `skill-schema.md` §4.

**Exit:** `0` on `pass` (skill promoted); `5` on `fail`; `6` regression; `7` budget; `3`
independence violation.

---

## 7. `ratchet doctor` — diagnostics  *(v0)*

Validates the install end-to-end **without** running the full gate: config parses, providers
authenticate, proposer ≠ verifier, vault integrity, managed-region delimiters intact, schema
versions current, budgets sane.

```
ratchet doctor [flags]
```

| Flag | Default | Meaning |
|---|---|---|
| `--fix` | false | Auto-repair safe issues (re-scaffold managed regions, run migrations). |
| `--check <name>` | all | Run a single check (`config`, `providers`, `independence`, `vault`, `schema`, `budgets`). |

**Checks & how they map to invariants**
```
[✓] config        Zod-valid, precedence resolved                  (config-schema.md)
[✓] providers     proposer + verifier reachable & authenticated   (AGENTS.md §Security)
[✓] independence  proposerConfigHash != verifierConfigHash        (invariant 2)
[✓] vault         managed regions intact; no user-note collision  (invariant 8)
[✓] schema        objects at current schemaVersion; migrations OK (invariant 4)
[✓] budgets       maxTrials/maxCostUSD/maxIterations present > 0   (invariant 6)
```

**Example**
```bash
npx ratchet doctor
npx ratchet doctor --check independence --json
```

**Exit:** `0` all pass; `3` config/independence failure; `4` vault failure; `8` provider failure;
`9` migration required.

---

## 7. `ratchet export` / `ratchet import` — portable skills  *(later, v3; stub in v0)*

Design the hooks now (Inventory B2/E5); ship promotion-grade behavior in v3. In v0 these exist as
stubs that emit/validate the `SkillEnvelope` shape but **never auto-promote** (AGENTS.md invariant
re: imported skills; `skill-schema.md` §6).

```
ratchet export <skillId> --out <path>      # writes SkillEnvelope (skill + proof + signature)
ratchet import <path>                       # ingests as `quarantined`, requires local re-verify
```

| Flag | Cmd | Meaning |
|---|---|---|
| `--out <path>` | export | Envelope output (`*.ratchet-skill.json`). |
| `--sign-key <ref>` | export | Signing key ref (env/keychain only; never in vault). |
| `--verify-only` | import | Validate signature + shape, do not store. |

**Import rule (enforced):** an imported skill lands as `quarantined`; it can become `promoted`
**only** after a local re-verification ProofRun via the same gate. There is no bypass.

**Exit:** `0`; `3` bad/untrusted signature; `5` local re-verify failed.

---

## 8. MCP server tool surface (what the host agent sees)

`@ratchet/mcp` exposes a small, stable set of tools over the Model Context Protocol (TS MCP SDK,
ADR-0002). The host agent uses these to feed sessions in and read progress out. **No MCP tool can
promote a skill outside the gate** — `ratchet.verify` runs the same `@ratchet/core` path, and there
is no "force promote" tool.

All tool params/returns are Zod-validated at the boundary (AGENTS.md §Code style). Returns are the
schema objects from `skill-schema.md`.

| Tool | Status | Params | Returns | Notes |
|---|---|---|---|---|
| `ratchet.capture_session` | **v0** | `{ transcript, toolCalls?, outcomes?, sessionId? }` | `{ sessionId, accepted: boolean }` | Input is **untrusted**; sanitized at distill. |
| `ratchet.distill` | **v0** | `{ sessionId }` | `{ notes: Note[], candidates: Skill[] }` | Writes Notes to vault managed regions; no promotion. |
| `ratchet.get_skills` | **v0** | `{ status?, scope?, query? }` | `{ skills: Skill[] }` | Read promoted/active skills for context injection. |
| `ratchet.get_context` | **v0** | `{ scope, triggers? }` | `{ skills: PromotedSkill[] }` | Skills to inject for the next session (applicability-filtered). |
| `ratchet.ledger` | v0 list / v1 curve | `{ view: "list"\|"curve", status? }` | `{ entries: LedgerEntry[], curve? }` | Read-only progress. |
| `ratchet.verify` | **v1** | `{ skillId, trials?, prosecutor?, revalidate? }` | `{ proofRun: ProofRun }` | Runs the gate; promotes only on `pass`. Honors budgets. |
| `ratchet.card` | **v1** | `{ format?, yardstick? }` | `{ uri, format }` | Renders the level-up card artifact. |
| `ratchet.export_skill` | **later (v3)** | `{ skillId }` | `{ envelope: SkillEnvelope }` | Stub in v0. |
| `ratchet.import_skill` | **later (v3)** | `{ envelope }` | `{ skillId, status: "quarantined" }` | Never auto-promotes. |

**MCP error model:** tools throw typed errors that map to the CLI exit codes above (e.g. a
budget breach surfaces as a `BUDGET_EXCEEDED` tool error; a regression as `REGRESSION_DETECTED`).
The host agent should treat `PROOF_FAILED`/`REGRESSION_DETECTED`/`BUDGET_EXCEEDED` as *verdicts*,
not as transport failures.

### MCP ↔ pipeline mapping

```
host agent ──ratchet.capture_session──▶ CAPTURE ──▶ DISTILL ──▶ (Notes + candidate Skills)
host agent ──ratchet.verify──────────▶ PROVE (gate) ──pass──▶ PROMOTE ──▶ LEDGER
host agent ──ratchet.get_context─────▶ CONTEXT PROVIDER ──▶ injected promoted skills
host agent ──ratchet.ledger/card─────▶ LEDGER (read-only)
```

---

## 9. Stability & versioning

- CLI command names, flags, exit codes, and MCP tool names/params are a **public contract**; changes
  follow semver and are noted in `CHANGELOG.md`. Removing or renaming requires a major bump + a
  deprecation window.
- Returned objects are the `@ratchet/schema` types; their `schemaVersion` travels with them, and a
  consumer hitting an older/newer version triggers `SCHEMA_MIGRATION_REQUIRED` (exit `9`) rather than
  silent misparse.

## 10. Related docs
`overview.md` · `skill-schema.md` · `proof-gate.md` · `config-schema.md` · `ledger-and-card.md` ·
`note-format.md` · `../security/threat-model.md`
