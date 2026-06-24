import { describe, expect, it } from "vitest";
import { LedgerEntrySchema } from "./ledger.js";
import { CURRENT_SCHEMA_VERSION } from "./shared.js";
import { ProofRunSchema, SkillSchema } from "./skill.js";

const validSkill = {
  id: "01K0RATCHETSKILL00000000001",
  schemaVersion: CURRENT_SCHEMA_VERSION,
  name: "Prefer pnpm in this workspace",
  kind: "preference",
  status: "candidate",
  body: "Use `pnpm` rather than npm or yarn for workspace commands.",
  applicability: {
    description: "When installing dependencies or running package scripts in Ratchet.",
    triggers: ["pnpm", "workspace", "package.json"],
    scope: "repo",
  },
  provenance: {
    origin: "local",
    sourceSessionId: "session-2026-06-22-001",
    proposerConfigHash: "proposer-config-hash",
    createdAt: "2026-06-22T12:00:00.000Z",
    createdBy: "codex",
  },
  lineage: {
    version: 1,
  },
  proofs: [],
  trust: {
    promoted: false,
    lastVerdict: "untested",
    confidence: 0,
  },
};

const passingProof = {
  id: "proof-run-001",
  verdict: "pass",
  manifest: {
    verifierConfigHash: "verifier-config-hash",
    models: [
      { role: "verifier", id: "verifier-model", seed: 42 },
      { role: "baseline", id: "baseline-model" },
    ],
    datasetId: "held-out-distill-001",
    configHash: "proof-config-hash",
    timestamp: "2026-06-22T12:30:00.000Z",
  },
  measurement: {
    baselineScore: 0.4,
    candidateScore: 0.7,
    delta: 0.3,
    trials: 5,
    significance: 0.03,
    metric: "task-success",
  },
};

describe("SkillSchema", () => {
  it("accepts the documented Skill fields", () => {
    expect(SkillSchema.parse(validSkill)).toEqual(validSkill);
  });

  it("enforces evaluator independence for proof references", () => {
    const result = SkillSchema.safeParse({
      ...validSkill,
      proofs: [
        {
          ...passingProof,
          manifest: {
            ...passingProof.manifest,
            verifierConfigHash: "proposer-config-hash",
          },
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("requires a passing proof reference for promoted skills", () => {
    const result = SkillSchema.safeParse({
      ...validSkill,
      status: "promoted",
      trust: {
        promoted: true,
        lastVerdict: "pass",
        confidence: 0.86,
        lastValidatedAt: "2026-06-22T12:30:00.000Z",
      },
    });

    expect(result.success).toBe(false);
  });

  it("accepts a promoted skill only when trust and proof references agree", () => {
    const promotedSkill = {
      ...validSkill,
      status: "promoted",
      proofs: [passingProof],
      trust: {
        promoted: true,
        lastVerdict: "pass",
        confidence: 0.86,
        lastValidatedAt: "2026-06-22T12:30:00.000Z",
      },
    };

    expect(SkillSchema.parse(promotedSkill)).toEqual(promotedSkill);
  });
});

const validProofRun = {
  id: "proof-run-001",
  schemaVersion: CURRENT_SCHEMA_VERSION,
  skillId: validSkill.id,
  verdict: "pass",
  manifest: passingProof.manifest,
  measurement: passingProof.measurement,
  regression: {
    skillsChecked: 1,
    regressions: [],
  },
  costUSD: 0.02,
};

describe("ProofRunSchema", () => {
  it("accepts a complete ProofRun receipt", () => {
    expect(ProofRunSchema.parse(validProofRun)).toEqual(validProofRun);
  });

  it("rejects passing ProofRuns that include regressions", () => {
    const result = ProofRunSchema.safeParse({
      ...validProofRun,
      regression: {
        skillsChecked: 1,
        regressions: [{ skillId: "prior-skill", before: 1, after: 0 }],
      },
    });

    expect(result.success).toBe(false);
  });

  it("requires verifier and baseline model receipts in the manifest", () => {
    const result = ProofRunSchema.safeParse({
      ...validProofRun,
      manifest: {
        ...validProofRun.manifest,
        models: [{ role: "verifier", id: "verifier-model", seed: 42 }],
      },
    });

    expect(result.success).toBe(false);
  });
});

describe("LedgerEntrySchema", () => {
  it("requires promoted ledger entries to point at a proof run", () => {
    const result = LedgerEntrySchema.safeParse({
      id: "ledger-001",
      schemaVersion: CURRENT_SCHEMA_VERSION,
      event: "promoted",
      skillId: validSkill.id,
      at: "2026-06-22T12:30:00.000Z",
      cumulativeSkills: 1,
    });

    expect(result.success).toBe(false);
  });

  it("accepts a promotion ledger entry backed by a proof run", () => {
    const entry = {
      id: "ledger-001",
      schemaVersion: CURRENT_SCHEMA_VERSION,
      event: "promoted",
      skillId: validSkill.id,
      proofRunId: validProofRun.id,
      at: "2026-06-22T12:30:00.000Z",
      cumulativeSkills: 1,
      benchmarkScore: 0.75,
    };

    expect(LedgerEntrySchema.parse(entry)).toEqual(entry);
  });
});
