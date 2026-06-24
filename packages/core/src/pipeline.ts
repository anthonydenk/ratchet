import {
  type LedgerEntry,
  type Note,
  NoteSchema,
  type ProofRun,
  type Skill,
} from "@ratchet/schema";
import { ulid } from "ulid";
import { distill } from "./distill.js";
import { type CandidateSkillWithProofTasks, distillSkillCandidates } from "./distill-skills.js";
import {
  appendLedgerEntryToVault,
  readEarnedSkills,
  writeCandidateSkillToVault,
  writePromotedSkillToVault,
  writeProofRunToVault,
} from "./ledger.js";
import { promoteSkill } from "./promotion.js";
import {
  createMemoryProofRunRecorder,
  evaluateProofGate,
  type ProofGateConfig,
  type ProofProviderConfig,
  type ProofRunRecorder,
  type ProofTrialEvaluator,
  type RegressionCheck,
} from "./proof-gate.js";
import type { ModelProvider } from "./provider.js";
import { writeNoteToVault } from "./vault.js";

export interface LearningCycleInput {
  sourceSessionId: string;
  transcript: string;
}

export interface LearningCycleOptions {
  vaultRoot: string;
  noteProvider: ModelProvider;
  skillProvider?: ModelProvider;
  proofEvaluator: ProofTrialEvaluator;
  proposer: ProofProviderConfig;
  verifier: ProofProviderConfig;
  baseline: ProofProviderConfig;
  proofConfig: ProofGateConfig;
  promote?: boolean;
  dryRun?: boolean;
  idFactory?: (label: string) => string;
  now?: () => Date;
  benchmarkScore?: (input: BenchmarkScoreInput) => number | Promise<number>;
}

export interface BenchmarkScoreInput {
  candidate: Skill;
  proofRun: ProofRun;
  cumulativeSkills: number;
}

export interface LearningCycleProofResult {
  candidate: Skill;
  proofRun: ProofRun;
}

export interface LearningCyclePromotion {
  skill: Skill;
  ledgerEntry: LedgerEntry;
}

export interface LearningCycleResult {
  sessionId: string;
  notes: Note[];
  candidates: CandidateSkillWithProofTasks[];
  proofResults: LearningCycleProofResult[];
  promoted: LearningCyclePromotion[];
  costUSD: number;
  dryRun: boolean;
}

export async function runLearningCycle(
  input: LearningCycleInput,
  options: LearningCycleOptions,
): Promise<LearningCycleResult> {
  const dryRun = options.dryRun ?? false;
  const shouldPromote = options.promote ?? true;
  const note = await distill(input, {
    provider: options.noteProvider,
    idFactory: () => options.idFactory?.("note") ?? ulid(),
    ...(options.now === undefined ? {} : { now: options.now }),
  });
  const candidates = await distillSkillCandidates(input, {
    provider: options.skillProvider ?? options.noteProvider,
    proposerConfigHash: options.proposer.configHash,
    ...(options.idFactory === undefined ? {} : { idFactory: options.idFactory }),
    ...(options.now === undefined ? {} : { now: options.now }),
  });

  if (!dryRun) {
    await writeNoteToVault(note, { vaultRoot: options.vaultRoot });

    for (const candidate of candidates) {
      await writeCandidateSkillToVault(candidate.skill, options.vaultRoot);
    }
  }

  const regressionChecks = await buildRegressionChecks(options.vaultRoot);
  const initialEarnedSkillCount = regressionChecks.length;
  const proofResults: LearningCycleProofResult[] = [];
  const promoted: LearningCyclePromotion[] = [];
  let noteWithPromotion = note;

  for (const candidate of candidates) {
    const recorder = dryRun
      ? createMemoryProofRunRecorder()
      : createVaultProofRunRecorder(options.vaultRoot);
    const proofRun = await evaluateProofGate(candidate.skill, {
      heldOutTasks: candidate.heldOutTasks,
      proposer: options.proposer,
      verifier: options.verifier,
      baseline: options.baseline,
      config: options.proofConfig,
      evaluator: options.proofEvaluator,
      regression: {
        checks: regressionChecks,
      },
      recorder,
      idFactory: () => options.idFactory?.(`proof-${candidate.skill.id}`) ?? ulid(),
      ...(options.now === undefined ? {} : { now: options.now }),
      iterationsAttempted: 0,
    });

    proofResults.push({ candidate: candidate.skill, proofRun });

    if (proofRun.verdict !== "pass" || !shouldPromote) {
      continue;
    }

    const cumulativeSkills = initialEarnedSkillCount + promoted.length + 1;
    const benchmarkScore = await resolveBenchmarkScore(options, {
      candidate: candidate.skill,
      proofRun,
      cumulativeSkills,
    });
    const promotion = promoteSkill(candidate.skill, proofRun, {
      cumulativeSkills,
      benchmarkScore,
      idFactory: () => options.idFactory?.(`ledger-${candidate.skill.id}`) ?? ulid(),
      ...(options.now === undefined ? {} : { now: options.now }),
    });

    promoted.push(promotion);

    if (noteWithPromotion.promotedToSkill === undefined) {
      noteWithPromotion = NoteSchema.parse({
        ...noteWithPromotion,
        promotedToSkill: promotion.skill.id,
      });
    }

    if (!dryRun) {
      await writePromotedSkillToVault(promotion.skill, options.vaultRoot);
      await appendLedgerEntryToVault(promotion.ledgerEntry, options.vaultRoot);
    }

    regressionChecks.push({
      skillId: promotion.skill.id,
      beforeScore: proofRun.measurement.candidateScore,
      afterScore: proofRun.measurement.candidateScore,
    });
  }

  if (!dryRun && noteWithPromotion.promotedToSkill !== note.promotedToSkill) {
    await writeNoteToVault(noteWithPromotion, { vaultRoot: options.vaultRoot });
  }

  return {
    sessionId: input.sourceSessionId,
    notes: [noteWithPromotion],
    candidates,
    proofResults,
    promoted,
    costUSD: proofResults.reduce((total, result) => total + result.proofRun.costUSD, 0),
    dryRun,
  };
}

async function resolveBenchmarkScore(
  options: LearningCycleOptions,
  input: BenchmarkScoreInput,
): Promise<number> {
  if (options.benchmarkScore === undefined) {
    return input.proofRun.measurement.candidateScore;
  }

  return options.benchmarkScore(input);
}

function createVaultProofRunRecorder(vaultRoot: string): ProofRunRecorder {
  return {
    async write(proofRun) {
      await writeProofRunToVault(proofRun, vaultRoot);
    },
  };
}

async function buildRegressionChecks(vaultRoot: string): Promise<RegressionCheck[]> {
  const earnedSkills = await readEarnedSkills(vaultRoot);

  return earnedSkills.map((earnedSkill) => ({
    skillId: earnedSkill.skill.id,
    beforeScore: earnedSkill.proofRun.measurement.candidateScore,
    afterScore: earnedSkill.proofRun.measurement.candidateScore,
  }));
}
