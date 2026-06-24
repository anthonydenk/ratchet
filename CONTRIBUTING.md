# Contributing to Ratchet

First: thank you for being here. Ratchet is **early and building in public**, which means right now is the best possible time to show up. Early contributors shape *everything* — the schema, the vocabulary, what "proof" even means in practice. A good issue or a small PR at this stage moves the project more than a thousand stars will later. Pull up a chair.

If you're not a classically trained dev, you're still welcome. The maintainer vibe-codes too. Curiosity and good judgment count more than credentials here.

---

## TL;DR for the impatient

```bash
git clone https://github.com/anthonydenk/ratchet.git
cd ratchet
pnpm install
pnpm build
pnpm typecheck && pnpm lint && pnpm test
```

Then read [`AGENTS.md`](AGENTS.md) — especially the **non-negotiable invariants** — and the [Definition of Done](docs/product/definition-of-done.md). Those two documents are the contract.

---

## 1. Setting up

Ratchet is a TypeScript monorepo on **pnpm workspaces**. You'll need **Node ≥ 20** and **pnpm**.

```bash
pnpm install                 # install deps (use pnpm, not npm/yarn)
pnpm build                   # build all packages (tsup)
pnpm dev                     # watch-build core + cli while you work
pnpm typecheck               # tsc --noEmit, strict — no `any`
```

The packages:

```
packages/
  schema/     # Zod source-of-truth: Skill, Note, ProofRun, Ledger (+ migrations)
  core/       # pipeline: capture → distill → prove → promote → ledger
  cli/        # `ratchet` commands (init, watch, ledger, verify, doctor)
  mcp/        # MCP server exposing capture/ledger tools to host agents
  providers/  # model/agent adapters (provider-agnostic interface)
```

Before changing data flow, read `docs/architecture/overview.md`. Before touching the schema, read `docs/architecture/skill-schema.md`. Before touching distillation/proof/promotion, read `docs/architecture/proof-gate.md`.

## 2. Running tests and evals

```bash
pnpm test                    # unit + integration (Vitest)
pnpm test -- <file>          # run a single test file
pnpm test:watch              # watch mode
pnpm lint                    # Biome check
pnpm format                  # Biome write
pnpm eval                    # META-EVALS: test the prover itself
```

Two rules that trip people up:

- **Mock all model calls in unit tests.** Live-model calls belong only in `*.eval.ts` under `pnpm eval`, never in `pnpm test`. `pnpm test` must be free, fast, and deterministic.
- **`pnpm eval` may need provider keys.** Meta-evals call real models, so they cost money and won't run in a forked PR's CI by default. Copy `.env.example` → `.env` and fill in the keys for the providers you're testing. See [`docs/architecture/config-schema.md`](docs/architecture/config-schema.md).

## 3. Branch & commit conventions

Straight from [`AGENTS.md`](AGENTS.md):

- **Conventional Commits.** Prefix every commit: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`.
- **Branch naming:** `feat/<short-desc>`, `fix/<short-desc>`.
- **Keep PRs small and single-purpose.** One idea per PR. It's easier to review, easier to revert, easier to learn from.
- **Docs are code.** Update `CHANGELOG.md` and any affected doc *in the same PR*.

## 4. The Definition of Done (the part that matters)

"Done" here is not "it runs on my machine." It is **verified, safe, documented, and shippable.** The full gates live in [`docs/product/definition-of-done.md`](docs/product/definition-of-done.md); the universal ones:

- [ ] `pnpm typecheck` clean (strict, no `any`).
- [ ] `pnpm lint` and `pnpm format` clean.
- [ ] `pnpm test` green; new logic has tests.
- [ ] All external/model output validated through `@ratchet/schema` at the boundary.
- [ ] No secrets/PII added to code, vault, ledger, logs, or fixtures.
- [ ] Affected docs updated in the same PR.
- [ ] `CHANGELOG.md` updated; Conventional Commit message.
- [ ] If an `AGENTS.md` invariant is touched, the PR description names it and explains why it still holds.

### ⭐ The meta-eval rule (for learning features)

This is the single most important rule in the project. If your change touches **distillation, proof, regression, or promotion**, it is **not done** until:

- [ ] **`pnpm eval` passes** — the prover's false-promote and false-reject rates stay within `evals/THRESHOLDS.md`.
- [ ] **Evaluator independence preserved** — proposer ≠ verifier config, verified in tests.
- [ ] **Regression suite intact** — a deliberately-bad skill is rejected in tests.
- [ ] **Fail-closed proven** — if proof/regression can't run, nothing is promoted (tested).

We test the prover itself, on purpose, because *proof is the product*. A learning PR without a passing meta-eval will not be merged — full stop. See [`docs/testing/meta-evals.md`](docs/testing/meta-evals.md).

## 5. How to propose a new skill type

Skills are defined by `@ratchet/schema`, so a new skill *kind* (e.g. a new way to classify or grade a lesson) is a **schema change**, and the schema is canonical. To propose one:

1. **Open an issue first** using the **Skill / learning issue** template. Describe the kind of thing you want the agent to learn, why the existing kinds don't fit, and what a held-out *check* for it would look like (if there's no way to prove it, it probably can't be a skill yet).
2. If we agree it's worth it, the implementation PR must:
   - bump the `@ratchet/schema` version and add a migration in `packages/schema/migrations` (any schema change is **at least a minor** version bump — see [`CHANGELOG.md`](CHANGELOG.md));
   - add or extend the meta-eval so the new kind is provable and won't false-promote;
   - update `docs/architecture/skill-schema.md`.

Don't hand-edit Skill/Note/ProofRun/Ledger objects as raw JSON anywhere — construct them through the schema.

## 6. How to report a bad promotion

A **bad promotion** — the gate promoted a skill that didn't actually help, or *rejected* one that clearly did — is the most valuable bug you can file. It's a direct hit on the thing Ratchet exists to get right.

Use the **Skill / learning issue** template and include:

- the **vault region** affected and the **ProofRun id** (from `.ratchet/` or `ratchet ledger`);
- the **manifest** for that ProofRun (model id, seed, config hash, dataset id);
- **expected vs. actual** — what the gate decided and what you believe was correct;
- whether it **falsely promoted** or **falsely rejected**.

These reports feed straight into `evals/` so the prover gets harder to fool over time.

## 7. PR checklist

Your PR template will mirror this, but in short, before you hit "Ready for review":

- [ ] `pnpm typecheck && pnpm lint && pnpm test` all green.
- [ ] If it's a learning-path change: `pnpm eval` green and meta-eval added/updated.
- [ ] Docs updated in the same PR.
- [ ] `CHANGELOG.md` "Unreleased" section updated.
- [ ] Conventional Commit message; small, single-purpose PR.
- [ ] **Invariant disclosure:** if the change touches any `AGENTS.md` invariant, the description names it and explains why it still holds.
- [ ] No secrets or PII anywhere — code, fixtures, logs, vault.

## 8. Code of Conduct

Participation is governed by our [Code of Conduct](CODE_OF_CONDUCT.md) (Contributor Covenant 2.1). Be kind; we're all figuring this out together.

## 9. Where to ask things

Not sure if your idea fits? Open an issue or a discussion before writing a lot of code — see [`SUPPORT.md`](SUPPORT.md). Half-formed questions are welcome. Honestly, "here's what I wish my agent would learn" is one of the most useful things you can post right now.

Thanks for building Ratchet with me.

— Anthony ([@anthonydenk](https://x.com/anthonydenk))
