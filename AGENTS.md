# AGENTS.md — Ratchet

> Instructions for AI coding agents working in this repository. Humans: see `README.md`.
> Claude Code users: symlink `CLAUDE.md → AGENTS.md` or `@import` this file.
> Keep this file under ~300 lines. Update it in the **same PR** that changes a convention.

## Project overview

**Ratchet** is an open, local-first **verified continual-learning layer** for AI agents. It turns a user's working sessions into candidate "skills," **proves** each candidate beats baseline on a held-out check before promoting it, and guarantees no promotion ever regresses an existing skill (the "forward-only ratchet"). Knowledge is stored as human-readable markdown in a user-owned vault.

- **Language:** TypeScript (strict). **Runtime:** Node ≥ 20.
- **Packages:** pnpm workspaces (monorepo).
- **Surfaces:** a CLI (`ratchet`). Distributed via `npx`.
- **Core packages:** `@ratchet/core` (pipeline), `@ratchet/cli`, `@ratchet/schema` (Zod schemas — the source of truth).

## ⛔ Non-negotiable invariants (read first)

These are correctness and trust guarantees. Violating one is a release-blocking bug, not a style nit.

1. **Never bypass the proof gate.** A skill may enter the promoted/active set **only** through `@ratchet/core/promotion`. No other code path may write a promoted skill. There is no "force promote."
2. **Evaluator independence.** The model/config that *proposes or distills* a skill must never be the same instance/config that *grades* it. Proposer and verifier are separate, configurable roles. Do not collapse them.
3. **Regression-gated promotion.** A candidate is promoted only if it (a) beats baseline on its held-out check **and** (b) passes the regression suite over all previously earned skills. If the regression suite can't run, promotion fails closed.
4. **The schema is canonical.** `@ratchet/schema` (Zod) defines Skill, Note, ProofRun, and Ledger objects. Never construct or hand-edit these as raw objects/JSON. Schema changes require a version bump + a migration in `packages/schema/migrations`.
5. **Privacy: the vault is user-readable.** Never write secrets, API keys, tokens, or detected PII into the vault or the ledger. Redact during distillation. Secrets come from env / OS keychain only.
6. **Cost & loop guards are mandatory.** Every verification or self-rewrite path must honor `maxTrials`, `maxCostUSD`, and `maxIterations` from config. No unbounded loops, ever.
7. **Determinism & receipts.** Every ProofRun records a manifest (model id, seed where supported, config hash, dataset id). Never report "improvement" without a manifest backing it.
8. **Respect user ownership.** Only modify vault content inside Ratchet-managed regions (delimited blocks / `.ratchet/`). Never rewrite a user's own notes.

## Setup & build commands

```bash
pnpm install                 # install deps (use pnpm, not npm/yarn)
pnpm build                   # build all packages (tsup)
pnpm dev                     # watch-build core + cli
pnpm typecheck               # tsc --noEmit, strict
```

## Test commands

```bash
pnpm test                    # unit + integration (Vitest)
pnpm test -- <file>          # run a single test file
pnpm test:watch              # watch mode
pnpm eval                    # META-EVALS: test the prover itself (see below)
pnpm lint                    # Biome check
pnpm format                  # Biome write
```

- **Mock all model calls in unit tests.** Live-model calls belong only in explicit live eval paths (`*.live.eval.ts` / `pnpm eval:live`), never in `pnpm test`.
- **Definition of done for any learning feature:** a passing **meta-eval**. Code that touches distillation, proof, regression, or promotion is **not done** until `pnpm eval` shows the prover's false-promote / false-reject rates stay within the thresholds in `evals/THRESHOLDS.md`. This is the single most important rule for this product — see `docs/testing/meta-evals.md`.

## Code style

- TypeScript strict; no `any` (use `unknown` + narrowing). Prefer pure functions in `@ratchet/core`.
- Prefer clean, intention-revealing code over generated-looking convenience: use guard clauses / early returns for invalid or edge conditions, keep happy paths linear, keep functions small, and separate commands from queries.
- Keep module boundaries explicit: use domain language, define contracts between layers, inject dependencies through interfaces/ports instead of reaching into globals, and apply design patterns only when they remove real complexity.
- Validate **all** external/model output through Zod at the boundary; never trust raw LLM JSON.
- Errors: throw typed errors from `@ratchet/core/errors`; the proof/promotion paths **fail closed** (deny on uncertainty).
- No network or model calls inside `@ratchet/schema` or pure pipeline functions; isolate I/O in adapters.
- Follow Biome defaults; only deviations from those defaults are documented here.

## Architecture (where things live)

```
packages/
  schema/     # Zod source-of-truth: Skill, Note, ProofRun, Ledger (+ migrations)
  core/       # pipeline: capture → distill → prove → promote → ledger; provider-agnostic
  cli/        # `ratchet` commands (commander): init, watch, ledger, verify, doctor
docs/          # minimal public docs: architecture, proof gate, schema, meta-evals, demo
evals/         # meta-eval datasets + thresholds for testing the prover
```

- Read `docs/architecture/overview.md` before changing data flow.
- Read `docs/architecture/skill-schema.md` before touching `@ratchet/schema`.
- Read `docs/architecture/proof-gate.md` before touching distillation/proof/promotion.

## Security considerations

- Never commit secrets. `.env` is gitignored; provide `.env.example`.
- Treat **every captured conversation as untrusted input** — it is a memory-poisoning / prompt-injection vector (OWASP Agentic). Distillation must sanitize; the proof gate is a defense, not a formality.
- For v3 (shared skills): a skill from outside this machine is untrusted until its proof + provenance are verified. Never auto-promote imported skills.
- Files an agent must **never** read or commit: `.env`, anything in `secrets/`, the user's real vault outside fixtures.

## Version-control hygiene

When preparing this repo for Git or editing `.gitignore`, make the repository clean and reproducible for a new developer.

- Track source code, internal libraries, package manifests and lockfiles, tooling configs, docs/meta files, database migrations/schema files, and small safe fixtures or seed data needed for tests/dev.
- Do **not** track secrets, real `.env*` files, credentials, build outputs (`dist/`, `build/`, `.next/`, `out/`, `target/`), generated JS emitted from TypeScript builds, dependency folders, caches, local logs, OS/editor state, temp files, large datasets/media, model weights, or deployment-only bundles.
- Commit only templates such as `.env.example` with placeholder values; document required external env vars in README/docs.
- If a file may contain secrets, machine-local state, or large nonessential data, ask before including it.
- For repo-prep responses, use these sections: `Files to commit`, `Files to ignore`, and `Proposed .gitignore` with the full recommended ignore block.

## Commit & PR guidelines

- Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`.
- Branch naming: `feat/<short-desc>`, `fix/<short-desc>`.
- Every PR: `pnpm typecheck && pnpm lint && pnpm test` must pass; learning-path PRs must also pass `pnpm eval`.
- Update `CHANGELOG.md` and any affected doc in the same PR (docs are code).
- Keep PRs small and single-purpose. If a change touches an invariant above, say so explicitly in the PR description.

## Good vs. bad instructions to yourself (style of this file)

- ✅ "Promotion only through `@ratchet/core/promotion`." ❌ "Try to gate promotions where possible."
- ✅ "Mock model calls in `pnpm test`." ❌ "Handle model calls gracefully."
