import {
  CURRENT_SCHEMA_VERSION,
  type LedgerEntry,
  LedgerEntrySchema,
  type ProofRun,
  type ProofRunRef,
  ProofRunSchema,
  type Skill,
  SkillSchema,
} from "@ratchet/schema";
import { ulid } from "ulid";
import { PromotionError, SchemaValidationError } from "./errors.js";

export interface PromoteSkillOptions {
  cumulativeSkills: number;
  benchmarkScore?: number;
  idFactory?: () => string;
  now?: () => Date;
}

export interface PromoteSkillResult {
  skill: Skill;
  ledgerEntry: LedgerEntry;
}

export function promoteSkill(
  inputCandidate: Skill,
  inputProofRun: ProofRun,
  options: PromoteSkillOptions,
): PromoteSkillResult {
  const candidate = parseSkill(inputCandidate);
  const proofRun = parseProofRun(inputProofRun);

  assertPromotionAllowed(candidate, proofRun);

  const lastValidatedAt = proofRun.manifest.timestamp;
  const proofRef: ProofRunRef = {
    id: proofRun.id,
    verdict: proofRun.verdict,
    manifest: proofRun.manifest,
    measurement: proofRun.measurement,
  };
  const promotedSkill = SkillSchema.parse({
    ...candidate,
    status: "promoted",
    proofs: [...candidate.proofs, proofRef],
    trust: {
      ...candidate.trust,
      promoted: true,
      lastVerdict: "pass",
      confidence: calculateConfidence(proofRun),
      lastValidatedAt,
    },
  });

  const ledgerEntry = LedgerEntrySchema.parse({
    id: (options.idFactory ?? ulid)(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    event: "promoted",
    skillId: promotedSkill.id,
    proofRunId: proofRun.id,
    at: (options.now ?? (() => new Date()))().toISOString(),
    cumulativeSkills: options.cumulativeSkills,
    ...(options.benchmarkScore === undefined ? {} : { benchmarkScore: options.benchmarkScore }),
  });

  return {
    skill: promotedSkill,
    ledgerEntry,
  };
}

function parseSkill(skill: Skill): Skill {
  const parsed = SkillSchema.safeParse(skill);

  if (!parsed.success) {
    throw new SchemaValidationError("Cannot promote an invalid Skill", { cause: parsed.error });
  }

  return parsed.data;
}

function parseProofRun(proofRun: ProofRun): ProofRun {
  const parsed = ProofRunSchema.safeParse(proofRun);

  if (!parsed.success) {
    throw new SchemaValidationError("Cannot promote with an invalid ProofRun", {
      cause: parsed.error,
    });
  }

  return parsed.data;
}

function assertPromotionAllowed(candidate: Skill, proofRun: ProofRun): void {
  if (candidate.status === "promoted") {
    throw new PromotionError("Skill is already promoted");
  }

  if (candidate.status === "quarantined" || candidate.provenance.origin === "imported") {
    throw new PromotionError("Imported or quarantined skills require local re-verification first");
  }

  if (proofRun.skillId !== candidate.id) {
    throw new PromotionError("ProofRun skillId does not match candidate skill id");
  }

  if (proofRun.verdict !== "pass") {
    throw new PromotionError("Only passing ProofRuns may promote a skill");
  }

  if (proofRun.manifest.verifierConfigHash === candidate.provenance.proposerConfigHash) {
    throw new PromotionError("Evaluator independence violated in ProofRun manifest");
  }

  if (proofRun.regression.regressions.length > 0) {
    throw new PromotionError("ProofRun contains regressions");
  }

  if (proofRun.measurement.trials <= 0) {
    throw new PromotionError("ProofRun has no completed trials");
  }
}

function calculateConfidence(proofRun: ProofRun): number {
  return Math.min(1, Math.max(0, 0.5 + proofRun.measurement.delta));
}
