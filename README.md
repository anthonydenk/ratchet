<p align="center">
  <img src="assets/brand/ratchet-mark.svg" alt="Ratchet logo" width="96" height="96" />
</p>

<h1 align="center">Ratchet</h1>

<p align="center">
  <strong>A local-first verified continual-learning layer for AI coding agents.</strong>
</p>

<p align="center">
  Ratchet turns working sessions into reusable skills, proves each skill improves the agent on held-out tasks, and only then promotes it into the earned-skill ledger.
</p>

<p align="center">
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-black.svg?style=flat-square" /></a>
  <a href="#status"><img alt="Status" src="https://img.shields.io/badge/status-early-orange?style=flat-square" /></a>
  <a href="docs/product/definition-of-done.md"><img alt="Definition of Done" src="https://img.shields.io/badge/proof--gated-yes-17191E?style=flat-square" /></a>
</p>

---

## What Ratchet is

AI coding agents can be useful in one session and forget the lesson in the next. Ratchet adds a forward-only learning loop:

1. Capture a session or transcript.
2. Distill it into clean notes and candidate skills.
3. Prove the candidate beats baseline on held-out tasks.
4. Reject it if the improvement is noise, overfit, or regresses an earned skill.
5. Promote only through the proof-gated promotion path.
6. Append a ledger receipt so improvement is visible and auditable.

The goal is not just memory storage. The goal is verified memory: skills are earned, receipt-backed, and regression-gated.

## Launch demo

The standalone launch demo is included in this repo:

[Open the standalone Ratchet launch demo](docs/demo/ratchet-launch-demo.html)

GitHub shows HTML files as source by default. To view the interactive demo, download the file or clone the repo and open `docs/demo/ratchet-launch-demo.html` in a browser.

## Quickstart from source

Requirements:

- Node.js 20 or newer
- pnpm 10 or newer

```bash
pnpm install
pnpm build

# Run the deterministic offline demo. No API key or live model call required.
node packages/cli/dist/bin.js demo

# Show earned skills and their proof receipts.
node packages/cli/dist/bin.js ledger

# Generate the shareable level-up card.
node packages/cli/dist/bin.js ledger --card
```

Expected demo output:

```text
Earned skill: Run database migrations before tests
Proof demo-proof-db-migration: delta +0.330, verdict pass, confidence 0.83
```

## Core commands

```bash
pnpm typecheck   # TypeScript strict checks
pnpm lint        # Biome checks
pnpm test        # Unit + integration tests; no live model calls
pnpm eval        # Deterministic meta-evals for the proof gate
pnpm eval:live   # Optional live-model evals; requires keys in .env
```

For local model-backed distillation, create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Never commit `.env`; only `.env.example` belongs in the repository.

## How the proof gate works

Ratchet promotes a skill only when all required checks pass:

- Held-out task set is valid and has a clear "better" definition.
- Candidate beats baseline over the configured trial floor.
- The gain clears the significance bar.
- Adjacent/generalization tasks improve, not only the exact proof task.
- Proposer and verifier configs are independent.
- Regression suite over earned skills passes.
- Cost and loop guards are honored.
- A complete ProofRun manifest is written.

Promotion is intentionally narrow: earned skills enter the active set only through `@ratchet/core/promotion`.

## Repository layout

```text
packages/
  schema/      Zod schemas for Notes, Skills, ProofRuns, and Ledger entries
  core/        Capture/distill/prove/promote/ledger pipeline
  cli/         ratchet command-line interface

docs/          Product, architecture, testing, security, and GTM docs
evals/         Meta-eval corpus and thresholds for testing the prover itself
assets/        Brand assets used by README and launch materials
```

## Development guardrails

- TypeScript strict, no unvalidated model output.
- Mock all model calls in `pnpm test`.
- Live model calls belong only in eval paths.
- Do not write secrets or detected PII into vaults, ledgers, fixtures, or logs.
- Learning-path changes are not done until `pnpm eval` stays within `evals/THRESHOLDS.md`.

See [AGENTS.md](AGENTS.md) for the full project-level rules used by coding agents.

## Status

Ratchet is early and moving quickly. The core proof gate, deterministic meta-evals, offline demo loop, ledger, and level-up card are in place. CLI/MCP ergonomics and provider integrations are still evolving.

## Documentation

- [Architecture overview](docs/architecture/overview.md)
- [Proof gate](docs/architecture/proof-gate.md)
- [Skill schema](docs/architecture/skill-schema.md)
- [CLI and MCP interface](docs/architecture/cli-mcp-interface.md)
- [Meta-evals](docs/testing/meta-evals.md)
- [Definition of done](docs/product/definition-of-done.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Keep changes small, proof-backed, and explicit about whether they touch distillation, proof, regression, promotion, or schema invariants.

## License

MIT. See [LICENSE](LICENSE).
