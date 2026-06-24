# Contributing to Ratchet

Ratchet is a TypeScript monorepo for a local-first, proof-gated learning loop. Contributions should keep the repo small, reproducible, and aligned with the invariants in [AGENTS.md](AGENTS.md).

## Setup

Requirements:

- Node.js 20 or newer
- pnpm 10 or newer

```bash
pnpm install
pnpm build
```

Useful commands:

```bash
pnpm dev         # watch-build core + CLI
pnpm typecheck   # TypeScript strict checks
pnpm lint        # Biome checks
pnpm test        # unit + integration; no live model calls
pnpm eval        # deterministic meta-evals for the proof gate
pnpm eval:live   # optional live-model evals; requires keys in .env
```

Never commit `.env`; copy `.env.example` locally when provider keys are needed.

## Repository Shape

```text
packages/
  schema/     Zod source of truth for Note, Skill, ProofRun, and Ledger
  core/       capture -> distill -> prove -> promote -> ledger pipeline
  cli/        ratchet command-line interface

docs/         minimal public architecture, proof, schema, meta-eval, and demo docs
evals/        meta-eval corpus, runner, and thresholds
assets/       public brand assets
```

Before changing data flow, read [docs/architecture/overview.md](docs/architecture/overview.md). Before touching schemas, read [docs/architecture/skill-schema.md](docs/architecture/skill-schema.md). Before touching distillation, proof, regression, or promotion, read [docs/architecture/proof-gate.md](docs/architecture/proof-gate.md) and [docs/testing/meta-evals.md](docs/testing/meta-evals.md).

## Definition of Done

For any PR:

- `pnpm typecheck` passes.
- `pnpm lint` passes.
- `pnpm test` passes.
- New behavior has focused tests.
- External/model output is validated through `@ratchet/schema`.
- No secrets, real `.env` files, PII, build outputs, dependency folders, local vaults, or generated reports are committed.
- Affected public docs and `CHANGELOG.md` are updated when behavior changes.
- Commits use Conventional Commit prefixes such as `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, or `chore:`.

For learning-path PRs touching distillation, proof, regression, promotion, or ledger behavior:

- `pnpm eval` passes within [evals/THRESHOLDS.md](evals/THRESHOLDS.md).
- Evaluator independence is preserved: proposer config and verifier config must differ.
- Regression checks still fail closed: if the regression suite cannot run, nothing is promoted.
- Promotion still goes only through `@ratchet/core/promotion`.

## Schema Changes

`@ratchet/schema` is canonical. Do not hand-build Note, Skill, ProofRun, or Ledger objects as raw JSON in production paths.

A schema change must:

- update the Zod schema in `packages/schema`;
- add a migration under `packages/schema/migrations`;
- bump the relevant schema/config version;
- update [docs/architecture/skill-schema.md](docs/architecture/skill-schema.md) and `CHANGELOG.md`;
- include tests.

## Reporting Bad Promotions

A bad promotion or bad rejection is a high-value bug. Include:

- the candidate skill id;
- the ProofRun id and manifest fields shown by `ratchet ledger`;
- expected vs. actual verdict;
- whether the issue was a false promote or false reject;
- any regression or leakage behavior you observed.

Those cases should become part of `evals/` so the gate gets harder to fool.

## Conduct

Participation is governed by [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Keep discussion technical, respectful, and grounded in reproducible evidence.
