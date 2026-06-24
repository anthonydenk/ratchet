# Ratchet — Config Schema (Zod-validated, zero-config goal)

**Status:** Draft v0.1 · Read `overview.md`, `proof-gate.md`, and `cli-mcp-interface.md` first.

> Ratchet aims for **zero-config**: sane defaults so the first run feels magical (Inventory B7, C10
> cold start). But every knob that touches correctness — proposer vs. verifier, budgets, the
> significance bar, generalization floor, expiry — is explicit, validated, and auditable. The config file is **Zod-validated
> at load** (AGENTS.md §Code style); an invalid config is a release-blocking failure that exits `3`,
> never a silent fallback.

---

## 1. Precedence (highest wins)

```
flags  >  env  >  config file  >  built-in defaults
```

- **flags** — per-invocation CLI flags (`--max-cost-usd`, `--verifier`, `--vault`, …).
- **env** — `RATCHET_*` environment variables and provider secrets (`.env`, OS keychain). **Secrets
  only ever come from here** (AGENTS.md invariant 5); never from the file or flags.
- **config file** — `ratchet.config.ts|js|json` (TS preferred for type-safety + comments).
- **defaults** — compiled into `@ratchet/schema`; what you get with no config at all.

Resolution is computed once at startup, the merged object is Zod-parsed, its `configHash` is recorded
(feeds ProofRun manifests, AGENTS.md invariant 7), and the result is immutable for the run.

```
  defaults ──┐
  file ──────┤
  env ───────┤──▶ deep-merge ──▶ Zod.parse() ──▶ frozen Config + configHash
  flags ─────┘                      │ fail ⇒ exit 3 (CONFIG_INVALID)
```

---

## 2. Top-level shape (Zod sketch)

`@ratchet/schema` is the source of truth; this is the intent, not a copy of the code.

```ts
// packages/schema/src/config.ts (sketch)
const ProviderRef = z.object({
  id: z.string(),                       // logical name, e.g. "verifier-primary"
  provider: z.string(),                 // adapter id: "anthropic" | "openai" | "openrouter" | "local" | ...
  model: z.string(),                    // model id passed to the adapter
  apiKeyEnv: z.string().optional(),     // NAME of the env var holding the key — never the key itself
  baseUrlEnv: z.string().optional(),
  seed: z.number().int().optional(),    // where the provider supports it (determinism receipts)
  params: z.record(z.unknown()).optional(),
});

const RatchetConfig = z.object({
  schemaVersion: z.string(),            // semver of the config schema; current sketch: 0.2.0

  vaultPath: z.string(),                // user-owned vault root

  host: z.object({                      // the host agent Ratchet wraps
    adapter: z.enum(["claude-code", "codex", "opencode", "custom"]),
    sessionSource: z.string().optional(),   // path/socket the adapter watches
  }),

  providers: z.object({
    proposer: ProviderRef,              // distills/proposes skills
    verifier: ProviderRef,              // grades them — MUST differ from proposer
    baseline: ProviderRef.optional(),   // defaults to host model if omitted
    prosecutor: ProviderRef.optional(), // adversarial verifier (recommended for subjective skills)
  }).refine(
    (p) => configHashOf(p.proposer) !== configHashOf(p.verifier),
    { message: "proposer and verifier must differ (evaluator independence)" }
  ),

  budgets: z.object({
    maxTrials: z.number().int().positive().default(5),       // ≥ proof-gate minTrials
    maxCostUSD: z.number().positive().default(1.0),          // per evaluation
    maxIterations: z.number().int().positive().default(3),   // self-rewrite loop cap (v2)
    maxCostUSDPerRun: z.number().positive().default(5.0),    // per `watch`/`verify` invocation
  }),

  proof: z.object({
    minTrials: z.number().int().min(3).default(5),
    significance: z.object({
      method: z.enum(["bootstrap-ci", "effect-size"]).default("bootstrap-ci"),
      alpha: z.number().min(0).max(1).default(0.05),         // CI must exclude zero at this level
      minEffect: z.number().min(0).default(0.0),             // optional effect-size floor
    }),
    generalizationMinLift: z.number().min(0).default(0.05),  // required adjacent-task lift
    taskSource: z.enum(["user", "mined", "synthesized", "hybrid"]).default("hybrid"),
    yardstickId: z.string().default("default-yardstick"),    // stable benchmark for the curve/card
  }),

  expiry: z.object({                    // staleness defaults (proof-gate §8)
    defaultDays: z.number().int().positive().default(90),
    byKind: z.record(z.number().int().positive()).optional(), // e.g. { fact: 30, preference: 365 }
    revalidateOnDriftSignals: z.boolean().default(true),      // re-run gate on dependency/API drift
  }),

  privacy: z.object({
    redactPII: z.boolean().default(true),                    // always on; here for audit visibility
    allowSynthesizedTasks: z.boolean().default(true),
  }).default({}),

  telemetry: z.object({                 // opt-in only (Inventory H1)
    enabled: z.boolean().default(false),
  }).default({}),
});
```

### Invariants enforced by the schema (not just convention)

1. **`proposer` config ≠ `verifier` config** — `.refine` rejects identical config hashes
   (AGENTS.md invariant 2; `proof-gate.md` §2). Violations exit `3`.
2. **`budgets.*` are all positive and present** — no unbounded loops (AGENTS.md invariant 6).
3. **`*.apiKeyEnv` holds a variable *name*, not a secret** — secrets resolve from env/keychain at
   runtime (AGENTS.md invariant 5). A literal-looking key in config fails a `doctor` lint.
4. **`proof.minTrials ≤ budgets.maxTrials`** — cross-field refine; otherwise the gate could never
   reach significance within budget.

---

## 3. Full annotated example — `ratchet.config.ts`

```ts
import { defineConfig } from "@ratchet/schema";

export default defineConfig({
  schemaVersion: "0.2.0",

  // User-owned markdown vault. Notes live here; only Ratchet-managed regions are written.
  vaultPath: "./vault",

  host: {
    adapter: "claude-code",            // the agent Ratchet is layering onto
    // sessionSource: "~/.claude/sessions",  // adapter-specific; omit to use the adapter default
  },

  providers: {
    // Proposer DISTILLS sessions into candidate skills. Cheaper model is fine here.
    proposer: {
      id: "proposer",
      provider: "anthropic",
      model: "claude-haiku-z",
      apiKeyEnv: "ANTHROPIC_API_KEY",  // NAME of env var, never the key
      seed: 7,
    },

    // Verifier GRADES candidates. MUST be a different config than the proposer.
    // Prefer a DIFFERENT PROVIDER/FAMILY to avoid correlated blind spots (proof-gate.md §2).
    verifier: {
      id: "verifier",
      provider: "openai",
      model: "gpt-x-mini",
      apiKeyEnv: "OPENAI_API_KEY",
      seed: 11,
    },

    // Baseline = the agent WITHOUT the candidate skill. Omit to use the host model.
    // baseline: { id: "baseline", provider: "anthropic", model: "claude-sonnet-z", apiKeyEnv: "ANTHROPIC_API_KEY" },

    // Optional adversarial verifier ("prosecutor") — argues the skill did NOT help; records dissent.
    prosecutor: {
      id: "prosecutor",
      provider: "openrouter",
      model: "some-strong-model",
      apiKeyEnv: "OPENROUTER_API_KEY",
    },
  },

  // Hard guards. Every proof/self-rewrite path honors these (AGENTS.md invariant 6).
  budgets: {
    maxTrials: 9,          // upper bound on trials per evaluation
    maxCostUSD: 0.75,      // dollar ceiling per single skill evaluation
    maxIterations: 3,      // self-rewrite loop cap (v2)
    maxCostUSDPerRun: 5.0, // ceiling for an entire `watch`/`verify` invocation
  },

  // How "better" is decided (proof-gate.md §1, §3).
  proof: {
    minTrials: 5,
    significance: {
      method: "bootstrap-ci",  // CI on (candidate − baseline) must exclude zero
      alpha: 0.05,
      minEffect: 0.02,         // and the effect must clear this floor
    },
    generalizationMinLift: 0.05, // adjacent held-out tasks must improve too
    taskSource: "hybrid",      // user checks first, then mined tasks, then synthesized (flagged)
    yardstickId: "default-yardstick",  // stable benchmark powering the comparable curve/card
  },

  // Staleness / decay (proof-gate.md §8). Facts rot faster than preferences.
  expiry: {
    defaultDays: 90,
    byKind: { fact: 30, preference: 365, constraint: 180 },
    revalidateOnDriftSignals: true,
  },

  privacy: { redactPII: true, allowSynthesizedTasks: true },
  telemetry: { enabled: false }, // opt-in only
});
```

---

## 4. Environment variables

`RATCHET_*` env vars override file values (precedence §1). Provider **secrets** are referenced by the
`apiKeyEnv` *name* in config and read from the environment at runtime — they never appear in the
config file, the vault, the ledger, or logs (AGENTS.md invariant 5).

| Variable | Overrides | Notes |
|---|---|---|
| `RATCHET_VAULT_PATH` | `vaultPath` | |
| `RATCHET_CONFIG` | config file path | |
| `RATCHET_MAX_COST_USD` | `budgets.maxCostUSD` | |
| `RATCHET_MAX_TRIALS` | `budgets.maxTrials` | |
| `RATCHET_MAX_ITERATIONS` | `budgets.maxIterations` | |
| `RATCHET_MIN_TRIALS` | `proof.minTrials` | |
| `RATCHET_GENERALIZATION_MIN_LIFT` | `proof.generalizationMinLift` | Minimum adjacent-task lift required to prevent teaching-to-the-test promotions. |
| `RATCHET_TELEMETRY` | `telemetry.enabled` | `0`/`1` |
| `ANTHROPIC_API_KEY` | — (secret) | referenced via `apiKeyEnv` |
| `OPENAI_API_KEY` | — (secret) | referenced via `apiKeyEnv` |
| `OPENROUTER_API_KEY` | — (secret) | referenced via `apiKeyEnv` |
| `RATCHET_SIGN_KEY` | — (secret) | export signing key ref (v3); env/keychain only |

### `.env.example` (ship this; `.env` is gitignored — AGENTS.md §Security)

```dotenv
# ─── Ratchet .env.example ───────────────────────────────────────────────
# Copy to .env and fill in. NEVER commit .env. Secrets live ONLY here or in
# your OS keychain — never in ratchet.config.ts, the vault, or the ledger.

# --- Provider API keys (referenced by `apiKeyEnv` in ratchet.config.ts) ---
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
OPENROUTER_API_KEY=

# --- Optional overrides (precedence: flags > env > file > defaults) -------
# RATCHET_VAULT_PATH=./vault
# RATCHET_CONFIG=./ratchet.config.ts
# RATCHET_MAX_COST_USD=0.75
# RATCHET_MAX_TRIALS=9
# RATCHET_MAX_ITERATIONS=3
# RATCHET_MIN_TRIALS=5
# RATCHET_GENERALIZATION_MIN_LIFT=0.05

# --- Telemetry is OPT-IN. Off unless you set this to 1. -------------------
# RATCHET_TELEMETRY=0

# --- v3 skill export signing (design now, ship later) --------------------
# RATCHET_SIGN_KEY=
```

---

## 5. Defaults & the zero-config path

With **no** config file, `ratchet init` writes the example above. With no env either, Ratchet still
runs in **distill-only** mode (v0): it produces Notes and candidate skills but cannot run the gate
(no verifier ⇒ no independent grading ⇒ no promotion). `ratchet doctor` reports exactly what is
missing to unlock the proof gate. This keeps cold start magical (notes appear immediately) while
never letting an un-graded skill slip into the active set.

```
no config + no env  ⇒  distill-only (Notes only, nothing promoted)
config w/ proposer only        ⇒  doctor flags: "verifier required to enable proof gate"
config w/ proposer ≠ verifier  ⇒  full proof gate enabled
```

## 6. Related docs
`overview.md` · `proof-gate.md` · `cli-mcp-interface.md` · `skill-schema.md` ·
`../security/threat-model.md`
