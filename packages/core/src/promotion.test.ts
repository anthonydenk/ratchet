import { CURRENT_SCHEMA_VERSION, type ProofRun, ProofRunSchema, type Skill } from "@ratchet/schema";
import { describe, expect, it } from "vitest";
import { PromotionError } from "./errors.js";
import { promoteSkill } from "./promotion.js";

const fixedDate = new Date("2026-06-23T12:00:00.000Z");

const candidate: Skill = {
  id: "candidate-skill-001",
  schemaVersion: CURRENT_SCHEMA_VERSION,
  name: "Prefer focused TypeScript modules",
  kind: "heuristic",
  status: "candidate",
  body: "Keep proof-gate logic in focused modules with explicit ports.",
  applicability: {
    description: "When implementing Ratchet proof-gate code.",
    scope: "repo",
  },
  provenance: {
    origin: "local",
    sourceSessionId: "session-proof-001",
    proposerConfigHash: "proposer-config-hash",
    createdAt: "2026-06-23T10:00:00.000Z",
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

function createProofRun(overrides: Partial<ProofRun> = {}): ProofRun {
  return ProofRunSchema.parse({
    id: "proof-run-001",
    schemaVersion: CURRENT_SCHEMA_VERSION,
    skillId: candidate.id,
    verdict: "pass",
    manifest: {
      verifierConfigHash: "verifier-config-hash",
      models: [
        { role: "verifier", id: "anthropic/verifier-model", seed: 11 },
        { role: "baseline", id: "local/baseline-agent", seed: 13 },
      ],
      datasetId: "heldout:task-typescript-boundaries",
      configHash: "proof-config-hash",
      timestamp: "2026-06-23T12:00:00.000Z",
    },
    measurement: {
      baselineScore: 0.5,
      candidateScore: 0.75,
      delta: 0.25,
      trials: 5,
      significance: 0.25,
      metric: "task-success",
    },
    regression: {
      skillsChecked: 0,
      regressions: [],
    },
    costUSD: 0.02,
    ...overrides,
  });
}

describe("promoteSkill", () => {
  it("promotes only a candidate backed by a passing proof and ledger entry", () => {
    const result = promoteSkill(candidate, createProofRun(), {
      cumulativeSkills: 1,
      benchmarkScore: 0.8,
      idFactory: () => "ledger-entry-001",
      now: () => fixedDate,
    });

    expect(result.skill.status).toBe("promoted");
    expect(result.skill.trust.promoted).toBe(true);
    expect(result.skill.proofs).toHaveLength(1);
    expect(result.ledgerEntry).toEqual({
      id: "ledger-entry-001",
      schemaVersion: CURRENT_SCHEMA_VERSION,
      event: "promoted",
      skillId: candidate.id,
      proofRunId: "proof-run-001",
      at: "2026-06-23T12:00:00.000Z",
      cumulativeSkills: 1,
      benchmarkScore: 0.8,
    });
  });

  it("rejects failed proof runs", () => {
    const proofRun = createProofRun({
      verdict: "fail",
      dissent: "not significantly better",
    });

    expect(() => promoteSkill(candidate, proofRun, { cumulativeSkills: 1 })).toThrow(
      PromotionError,
    );
  });

  it("rejects proof runs that violate evaluator independence", () => {
    const proofRun = createProofRun({
      manifest: {
        ...createProofRun().manifest,
        verifierConfigHash: candidate.provenance.proposerConfigHash,
      },
    });

    expect(() => promoteSkill(candidate, proofRun, { cumulativeSkills: 1 })).toThrow(
      PromotionError,
    );
  });

  it("does not auto-promote imported skills", () => {
    const importedSkill: Skill = {
      ...candidate,
      provenance: {
        ...candidate.provenance,
        origin: "imported",
      },
    };

    expect(() => promoteSkill(importedSkill, createProofRun(), { cumulativeSkills: 1 })).toThrow(
      PromotionError,
    );
  });
});
