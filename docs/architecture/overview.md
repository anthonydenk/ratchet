# Ratchet — Architecture Overview

**Status:** Draft v0.1 · Read this before changing data flow.

---

## 1. One-paragraph model

Ratchet is a pipeline: **capture → distill → prove → promote → ledger**, wrapped around a host agent and backed by a user-owned markdown vault. It is provider-agnostic (any model/agent via adapters), local-first (no required cloud), and built so that the only path into an agent's *active* skill set is through the verified promotion gate.

## 2. Components & data flow

```
 ┌─────────┐   sessions   ┌──────────┐   notes    ┌──────────┐  candidate ┌──────────┐
 │  HOST    │────────────▶│ CAPTURE   │──────────▶│ DISTILL   │──────────▶│  PROVE    │
 │  AGENT   │             │ (adapter) │            │ (LLM+rules)│  skill    │ (gate)    │
 └─────────┘              └──────────┘            └──────────┘            └────┬─────┘
      ▲                                                                        │ verdict
      │ promoted skills injected into context                                  ▼
 ┌────┴─────┐   active skills   ┌──────────┐   promote/reject   ┌──────────────────────┐
 │ CONTEXT   │◀─────────────────│ PROMOTE   │◀──────────────────│ PROOF + REGRESSION     │
 │ PROVIDER  │                  │ (only path)│                   │ held-out + prior skills│
 └──────────┘                  └────┬─────┘                     └──────────────────────┘
                                     │ append
                                     ▼
                               ┌──────────┐   render   ┌────────────────┐
                               │  LEDGER   │──────────▶│ level-up card   │
                               │ (store)   │            │ + curve (share) │
                               └──────────┘            └────────────────┘
```

- **Capture** — an adapter pulls the working session (transcript, tool calls, outcomes) from the host agent. Untrusted input.
- **Distill** — converts a noisy session into compact, human-readable **Notes** and one or more **candidate Skills**. LLM-assisted, schema-validated, sanitized.
- **Prove** — the gate. Runs the candidate against a held-out check vs. baseline, with a *separate* verifier role, plus the regression suite over earned skills. Emits a **ProofRun**.
- **Promote** — the *only* code path that moves a skill to `promoted`. Fail-closed.
- **Ledger** — append-only record of earned skills, proofs, and the improvement curve; renders the shareable card.
- **Context provider** — injects promoted skills back into the host agent's context for the next session.

## 3. Package layout (monorepo, pnpm)

```
packages/
  schema/     # Zod source-of-truth: Skill, Note, ProofRun, Ledger (+ migrations)
  core/       # pipeline orchestration; pure where possible; no direct I/O in logic
  providers/  # model + host-agent adapters behind a stable interface
  cli/        # `ratchet` (commander): init, watch, ledger, verify, doctor, export
  mcp/        # MCP server exposing capture/ledger tools to host agents
apps/
  (later) web # optional local dashboard
evals/        # meta-eval datasets + THRESHOLDS.md (testing the prover)
docs/         # this suite
```

## 4. Key interfaces (sketch)

```ts
interface HostAgentAdapter {
  captureSession(): Promise<SessionTranscript>;     // untrusted
  injectSkills(skills: PromotedSkill[]): Promise<void>;
}
interface ModelProvider {
  id: string;
  complete(req: CompletionRequest): Promise<CompletionResult>; // manifest-logged
}
interface ProofGate {
  evaluate(candidate: CandidateSkill, ctx: ProofContext): Promise<ProofRun>; // verdict + manifest
}
```

Adapters isolate all I/O and model calls. `@ratchet/core` logic stays pure and testable; `@ratchet/schema` never performs I/O.

## 5. Storage & state

- **Vault** (user-owned): markdown Notes + skills in Ratchet-managed regions only.
- **`.ratchet/`** (managed): ledger, ProofRuns, candidate queue, run manifests, config. Index in SQLite (better-sqlite3) for speed; source of truth remains the schema-validated files for portability.
- **Versioning:** every Skill/ProofRun carries a schema version; migrations in `packages/schema/migrations`.

## 6. Cross-cutting requirements

- **Provider-agnostic:** no provider name hardcoded in `core`; everything via `ModelProvider`.
- **Determinism receipts:** every model call + ProofRun logs a manifest (model id, seed if supported, config hash, dataset id).
- **Cost/loop guards:** `maxTrials`, `maxCostUSD`, `maxIterations` enforced in `core`; unbounded loops are a bug.
- **Fail-closed:** uncertainty in proof/regression ⇒ reject, never promote.
- **Privacy:** sanitize at distillation; never persist secrets/PII to vault/ledger/logs.

## 7. Sequence — one learning cycle

1. `watch` detects a completed session → `capture`.
2. `distill` produces Notes + ≥0 candidate Skills (validated, sanitized).
3. For each candidate: `prove` → ProofRun (baseline vs candidate, N trials, significance) + regression over earned skills.
4. If verdict = pass → `promote` (append to ledger, mark `promoted`, version lineage). Else → keep as `candidate`/`draft` with the dissent recorded.
5. `ledger` updates the curve; next session, `context provider` injects promoted skills.

## 8. Related docs
`skill-schema.md` · `proof-gate.md` · `cli-mcp-interface.md` · `config-schema.md` · `adr/` · `../security/threat-model.md`
