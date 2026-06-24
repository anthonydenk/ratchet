# Ratchet — Secrets Management

**Status:** Draft v0.1 · Inventory E4 · Read `config-schema.md` §4 and `privacy.md` first.

> One rule, stated four ways so it can't be missed: **a secret lives in env or the OS keychain, and
> nowhere else.** Never in the config file, never in the vault, never in the ledger, never in a
> ProofRun manifest, never in fixtures, never in logs. This is AGENTS.md invariant 5 and schema
> invariant 3, made operational.

---

## 1. What counts as a secret

Provider API keys and tokens (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, …), the v3
export signing key (`RATCHET_SIGN_KEY`), and any bearer token, password, private key, or connection
string that appears in a session. Provider secrets are *Ratchet's* credentials; in-session secrets are
the *user's* and are governed additionally by redaction (`privacy.md` §4).

## 2. Where secrets come from — and the only place they live

```
   ┌──────────────┐        referenced by NAME        ┌────────────────────┐
   │ ratchet.config│  apiKeyEnv: "ANTHROPIC_API_KEY" │  resolved at runtime│
   │  (no secrets) │ ───────────────────────────────▶│  from env / keychain│
   └──────────────┘                                  └────────────────────┘
```

- **Source of truth:** environment variables and/or the OS keychain — **only** (AGENTS.md invariant 5;
  `config-schema.md` §1 precedence).
- **Config references the *name*, not the value.** `apiKeyEnv` holds the env-var *name*
  (`"ANTHROPIC_API_KEY"`), never the key itself (`config-schema.md` §2 invariant 3). A literal-looking
  key in config fails a `ratchet doctor` lint.
- **Resolved at runtime, held in memory only** for the duration of the run; never persisted.

## 3. Never-write list (where secrets must NOT appear)

| Sink | Rule | Enforced by |
|---|---|---|
| The config file | Names only, never values | `doctor` lint; `config-schema.md` §2 |
| The vault (markdown) | Redacted at distillation; user-readable ⇒ must be clean | AGENTS.md invariant 5; `privacy.md` §4 |
| The ledger | Never | schema invariant 3 |
| ProofRun manifests | Never (manifest = model ids, configHash, datasetId — no keys) | schema invariant 3; `skill-schema.md` §4 |
| Fixtures / golden datasets | Never — use placeholders (`sk-EXAMPLE…`) | this doc §5; Inventory D5 |
| Logs / stdout / error reports | Never logged, even on failure | §4 |
| Telemetry | Never (and telemetry is opt-in anyway) | `config-schema.md` §2 |

## 4. Never logged

- Secret values are never written to logs, stack traces, or error messages — including on failure
  paths. Errors reference the **env-var name** that was missing/invalid, never its value.
- Manifests deliberately carry only non-secret identifiers (model id, `configHash`, `datasetId`,
  seed), so receipts can be shared without leaking keys (`skill-schema.md` §4).
- If a provider call fails, log the provider `id` and status, not the Authorization header.

## 5. Fixtures & tests

- Fixtures and golden datasets (Inventory D5) must use obvious **placeholder** secrets
  (`sk-EXAMPLE-do-not-use`), never real ones.
- Live-model calls belong only in `*.eval.ts` under `pnpm eval`; those read real keys from env at run
  time and still never persist them (AGENTS.md §Test commands). `pnpm test` mocks all model calls, so
  unit tests need no secrets at all.

## 6. `.env` hygiene & repo controls

- **`.env` is gitignored**; ship a committed **`.env.example`** with blank values and comments
  (AGENTS.md §Security; `config-schema.md` §4). The example documents every key by name.
- **Files an agent/contributor must never read or commit:** `.env`, anything under `secrets/`, and the
  user's real vault outside fixtures (AGENTS.md §Security).
- **Secret scanning (recommended, strongly):**
  - A **pre-commit hook** (e.g. `gitleaks` or `git-secrets`) to block accidental key commits locally.
  - **CI secret scanning** (e.g. `gitleaks` in the pipeline, plus GitHub **push protection** / secret
    scanning) so a leaked key fails the build, not production.
  - Treat any key that *does* land in history as **compromised**: rotate it immediately (§7), don't
    just delete the commit.

## 7. Rotation & incident response

- Provider keys are rotated through the provider's console; Ratchet picks up the new value from env/
  keychain on the next run — **no Ratchet-side state to migrate** (keys were never stored).
- If a key is exposed (e.g. committed, pasted in an issue): **revoke and rotate at the provider first**,
  then remove from history. Because Ratchet never stores keys, there is no Ratchet artifact to purge —
  but check that no key leaked into a fixture, log, or vault entry (the never-write list, §3).
- Vulnerability reporting (including "I found a key in your repo") follows the disclosure process in
  `../../SECURITY.md`.

## 8. The v3 signing key (`RATCHET_SIGN_KEY`)

The export signing key (used to sign `SkillEnvelope`s in v3) is a secret like any other: env/keychain
only, never in config/vault/ledger/logs/fixtures. Its lifecycle, verification, and the
quarantine-then-re-verify import rule are specified in `provenance-signing.md`.

---

## 9. Related docs

`config-schema.md` §4 · `../security/privacy.md` · `../security/threat-model.md` ·
`../security/provenance-signing.md` · `../../SECURITY.md` · `AGENTS.md` (invariant 5 + §Security)
