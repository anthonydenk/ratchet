<!-- Thanks for contributing to Ratchet! Keep PRs small and single-purpose. -->

## What this changes

<!-- Brief description + linked issue (Closes #...). -->

## Type

- [ ] feat
- [ ] fix
- [ ] docs
- [ ] test
- [ ] refactor / chore

## Definition of Done checklist

See [docs/product/definition-of-done.md](../docs/product/definition-of-done.md).

- [ ] `pnpm typecheck` clean (strict, no `any`)
- [ ] `pnpm lint` and `pnpm format` clean
- [ ] `pnpm test` green; new logic has tests
- [ ] External/model output validated through `@ratchet/schema` at the boundary
- [ ] No secrets/PII in code, vault, ledger, logs, or fixtures
- [ ] Affected docs updated **in this PR**
- [ ] `CHANGELOG.md` updated; Conventional Commit messages

## ⭐ Learning-path changes only (distillation / proof / regression / promotion)

If this PR touches any of those, it is **not done** without:

- [ ] `pnpm eval` (meta-evals) green within `evals/THRESHOLDS.md`
- [ ] Evaluator independence preserved (proposer ≠ verifier)
- [ ] Regression suite intact; a deliberately-bad skill is rejected in tests
- [ ] Determinism receipts (manifests) complete
- [ ] Fail-closed behavior verified

## Invariant disclosure

- [ ] This PR does **not** touch any [`AGENTS.md`](../AGENTS.md) invariant.
- [ ] It does — and here's why the guarantee still holds:

<!-- explain -->
