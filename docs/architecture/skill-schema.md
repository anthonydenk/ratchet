# Ratchet — Skill Schema (the canonical data model)

> ⭐ The single most important spec in the project. Everything depends on it, and **v3 (the Verified Experience Commons) is only possible if skills are portable from day one.** Design for export now, even though export ships later.

**Source of truth:** `@ratchet/schema` (Zod). Never hand-construct these objects — build through the schema, validate at every boundary.

---

## 1. Core objects

- **Note** — a human-readable, distilled artifact from a session (a decision, a preference, a gotcha). Lives in the vault.
- **Skill** — a candidate or earned, reusable capability with applicability conditions and an attached proof history.
- **ProofRun** — the evidence a skill was tested (see `proof-gate.md` for semantics).
- **Ledger entry** — an append-only record of a promotion/retirement event for the curve + card.

## 2. Skill object

```ts
// packages/schema/src/skill.ts (sketch)
type SkillStatus = "draft" | "candidate" | "promoted" | "retired" | "quarantined";
type SkillKind   = "preference" | "procedure" | "fact" | "heuristic" | "constraint";

interface Skill {
  id: string;                      // stable ULID; never reused
  schemaVersion: string;           // semver of this object's schema
  name: string;                    // short, human-readable ("Always run db migrations before tests")
  kind: SkillKind;
  status: SkillStatus;

  // the actual content the agent uses
  body: string;                    // the instruction/knowledge, sanitized markdown
  applicability: {                 // WHEN this skill should fire (avoids over-application)
    description: string;
    triggers?: string[];           // keywords/paths/contexts
    scope?: "global" | "repo" | "language" | "task";
  };

  // trust + lineage
  provenance: {
    origin: "local" | "imported";  // imported ⇒ untrusted until verified (v3)
    sourceSessionId?: string;
    proposerConfigHash: string;    // which proposer distilled it (must ≠ verifier)
    createdAt: string;             // ISO-8601
    createdBy: string;             // user/agent id (no PII beyond a handle)
  };
  lineage: {
    parents?: string[];            // skills this was derived/merged from
    supersedes?: string;           // prior skill id this replaces
    version: number;               // bump on body change
  };

  // proof + lifecycle
  proofs: ProofRunRef[];           // history; most recent decides current trust
  trust: {
    promoted: boolean;
    lastVerdict: "pass" | "fail" | "untested";
    confidence: number;            // 0..1, from the gate
    lastValidatedAt?: string;
    expiresAt?: string;            // staleness: re-validate after this
  };

  // conflict handling
  conflictsWith?: string[];        // skill ids known to contradict this
  tags?: string[];
}
```

## 3. Note object

```ts
interface Note {
  id: string;
  schemaVersion: string;
  title: string;
  body: string;                    // distilled, sanitized markdown
  sourceSessionId: string;
  kind: "summary" | "decision" | "gotcha" | "preference";
  promotedToSkill?: string;        // skill id, if this note became a candidate
  createdAt: string;
  vaultPath: string;               // where it lives (Ratchet-managed region)
}
```

## 4. ProofRun object (evidence)

```ts
interface ProofRun {
  id: string;
  schemaVersion: string;
  skillId: string;
  verdict: "pass" | "fail";
  // the receipt — never report improvement without this
  manifest: {
    verifierConfigHash: string;    // MUST differ from skill.provenance.proposerConfigHash
    models: { role: "verifier" | "baseline"; id: string; seed?: number }[];
    datasetId: string;             // held-out task set id
    configHash: string;
    timestamp: string;
  };
  measurement: {
    baselineScore: number;
    candidateScore: number;
    delta: number;
    trials: number;                // ≥ minTrials from proof-gate
    significance: number;          // e.g. p-value or bootstrap CI; meets threshold
    metric: string;                // what "better" meant for this skill
  };
  regression: {
    skillsChecked: number;
    regressions: { skillId: string; before: number; after: number }[]; // must be empty to pass
  };
  dissent?: string;                // why it failed / strongest objection (from verifier/prosecutor)
  costUSD: number;
}
type ProofRunRef = Pick<ProofRun, "id" | "verdict" | "manifest" | "measurement">;
```

## 5. Ledger entry

```ts
interface LedgerEntry {
  id: string;
  schemaVersion: string;
  event: "promoted" | "retired" | "quarantined" | "revalidated";
  skillId: string;
  proofRunId?: string;
  at: string;
  // snapshot for the curve / level-up card
  cumulativeSkills: number;
  benchmarkScore?: number;         // running score on a stable yardstick task set
}
```

## 6. Portability & export (design now, ship in v3)

A shareable skill is `Skill` + its deciding `ProofRun` + a signature. The **export envelope**:

```ts
interface SkillEnvelope {
  skill: Skill;                    // with provenance.origin = "imported" on the receiver
  proof: ProofRun;                 // the evidence travels with the skill
  signature: string;              // signed by exporter; verified before any use
  ratchetVersion: string;
}
```

Rule: an imported skill is `quarantined` until its proof is *re-verified locally* and its signature checked. Never auto-promote imported skills.

## 7. Versioning & migration

- Every object carries `schemaVersion` (semver).
- Any field change ⇒ minor bump + a migration in `packages/schema/migrations/<from>-<to>.ts` + a round-trip test.
- Never silently drop unknown fields on read; preserve for forward-compat where safe.

## 8. Invariants (enforced in code + tests)

1. `proofs[].manifest.verifierConfigHash !== provenance.proposerConfigHash` (evaluator independence).
2. `status: "promoted"` requires a `pass` ProofRun with empty `regression.regressions`.
3. Secrets/PII never appear in `body`, `Note.body`, or any manifest.
4. `id` is immutable and never reused across skills.
5. Imported skills cannot be `promoted` without a local re-verification ProofRun.
