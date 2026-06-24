# ADR-0002: TypeScript / Node stack (pnpm, Vitest, Zod, commander, MCP SDK)

- **Status:** Accepted
- **Date:** 2026-06-22
- **Deciders:** Ratchet maintainers
- **Supersedes:** —

## Context

Ratchet ships a CLI (`ratchet`) and an MCP server, distributed via `npx`, layered onto whatever host
agent the user already runs (PRD §4: "drops onto your setup"). The primary persona (the vibe coder)
must get a **one-command install** with no toolchain ceremony (Inventory F8, C10 cold start). The
secondary persona (the researcher) needs **rigor**: a schema that is the source of truth and tests
that can gate every learning feature.

We must pick a language, runtime, package manager, test runner, validation library, CLI framework, and
MCP implementation. The choice is locked in early because it shapes the public API and the monorepo
(AGENTS.md already states the intended stack — this ADR records the *why*).

Constraints:
- Distribution must be `npx`-friendly and cross-platform (macOS/Linux/Windows).
- The schema (`@ratchet/schema`) is canonical and must validate untrusted LLM output at the boundary.
- The MCP server is a first-class surface; we want official, maintained tooling.
- We want strict typing to make the invariants enforceable in code, not just docs.

## Decision

Adopt a **TypeScript (strict) on Node ≥ 20** stack:

| Concern | Choice | Why |
|---|---|---|
| Language | **TypeScript, strict, no `any`** | Static guarantees for invariants; `unknown` + narrowing forces validation. |
| Runtime | **Node ≥ 20** | Ubiquitous on dev machines; native fetch, test runner, stable ESM. |
| Packages | **pnpm workspaces (monorepo)** | Fast, disk-efficient, strict dep isolation; clean `@ratchet/*` boundaries. |
| Tests | **Vitest** | Fast, TS-native, great mocking — essential since unit tests must **mock all model calls**. |
| Validation | **Zod** | `@ratchet/schema` source of truth; validate all external/model output at the boundary. |
| CLI | **commander** | Mature, predictable arg parsing for the stable CLI contract (`cli-mcp-interface.md`). |
| MCP | **official MCP TypeScript SDK** | First-party, maintained protocol implementation for the host-agent surface. |
| Build | **tsup** | Simple, fast bundling of each package (per AGENTS.md build commands). |
| Lint/format | **Biome** | One fast tool for lint + format; minimal config (per AGENTS.md). |

This keeps the entire stack in one language end-to-end (schema → core → CLI → MCP), so the canonical
Zod types flow everywhere without a serialization seam.

## Consequences

**Positive**
- **One-command install** via `npx ratchet` — no compiler/runtime to pre-install beyond Node, which
  the target users already have. Directly serves the cold-start/activation goal.
- **Zod as the spine** lets the schema be both the runtime validator (untrusted LLM output) and the
  static type source — one definition, enforced at every boundary (AGENTS.md invariant 4).
- **Vitest mocking** makes the "mock all model calls in `pnpm test`; live calls only in `pnpm eval`"
  rule practical and fast.
- Official MCP SDK reduces protocol drift risk on a surface we promise not to break.
- Strict TS makes several invariants compile-time or test-time enforceable rather than aspirational.

**Negative / costs**
- Node/JS numeric and concurrency ergonomics are weaker than, say, Python for heavy data/eval work;
  acceptable because the heavy lifting is model calls (I/O-bound), not local compute.
- ESM + tooling friction across the ecosystem requires discipline (pinned, tested config).
- Zod adds runtime validation overhead; accepted — correctness at the boundary outweighs the cost, and
  hot paths can be profiled.

**Revisit if:** we need to embed local model inference or heavy numerical eval where a different
runtime would dominate — that would be a new ADR, not an edit here.

## Related
`0001-record-architecture-decisions.md` · `0003-markdown-vault-substrate.md` · `../overview.md` ·
`../config-schema.md` · `AGENTS.md`
