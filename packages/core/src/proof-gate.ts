import {
  CURRENT_SCHEMA_VERSION,
  type ProofRun,
  ProofRunSchema,
  type Skill,
  SkillSchema,
} from "@ratchet/schema";
import { ulid } from "ulid";
import { ProofGateError, SchemaValidationError } from "./errors.js";

export type TaskSource = "user" | "mined" | "synthesized" | "hybrid";

export interface HeldOutTask {
  id: string;
  source: TaskSource;
  proofRole?: "exact" | "adjacent";
  metric: string;
  input: string;
  better: {
    description: string;
    direction: "higher-score";
  };
  leakedFromTraining?: boolean;
}

export interface ProofProviderConfig {
  id: string;
  family: string;
  model: string;
  configHash: string;
  seed?: number;
}

export interface ProofGateConfig {
  minTrials: number;
  maxTrials: number;
  maxCostUSD: number;
  maxIterations: number;
  generalizationMinLift?: number;
  significance: {
    method: "bootstrap-ci" | "effect-size";
    alpha: number;
    minEffect: number;
  };
  configHash: string;
}

export interface ProofTrialRequest {
  candidate: Skill;
  task: HeldOutTask;
  mode: "baseline" | "candidate";
  trial: number;
  proposer: ProofProviderConfig;
  verifier: ProofProviderConfig;
}

export interface ProofTrialResult {
  score: number;
  costUSD: number;
}

export interface ProofTrialEvaluator {
  score(request: ProofTrialRequest): Promise<ProofTrialResult>;
}

export interface RegressionCheck {
  skillId: string;
  beforeScore: number;
  afterScore: number;
}

export interface RegressionSuite {
  checks: RegressionCheck[];
  failToRun?: boolean;
}

export interface ProofRunRecorder {
  write(proofRun: ProofRun): Promise<void>;
}

export interface EvaluateProofGateContext {
  heldOutTasks: HeldOutTask[];
  proposer: ProofProviderConfig;
  verifier: ProofProviderConfig;
  baseline: ProofProviderConfig;
  config: ProofGateConfig;
  evaluator: ProofTrialEvaluator;
  regression: RegressionSuite;
  recorder: ProofRunRecorder;
  idFactory?: () => string;
  now?: () => Date;
  iterationsAttempted?: number;
}

interface TrialScores {
  score: number;
  costUSD: number;
  trialsCompleted: number;
  taskScores: Map<string, number>;
}

interface BuildProofRunInput {
  candidate: Skill;
  context: EvaluateProofGateContext;
  datasetId: string;
  verdict: "pass" | "fail";
  baselineScore: number;
  candidateScore: number;
  trials: number;
  significance: number;
  metric: string;
  regression: {
    skillsChecked: number;
    regressions: { skillId: string; before: number; after: number }[];
  };
  costUSD: number;
  dissent?: string;
}

export function createMemoryProofRunRecorder(): ProofRunRecorder & { proofRuns: ProofRun[] } {
  const proofRuns: ProofRun[] = [];

  return {
    proofRuns,
    async write(proofRun) {
      proofRuns.push(proofRun);
    },
  };
}

export async function evaluateProofGate(
  inputCandidate: Skill,
  context: EvaluateProofGateContext,
): Promise<ProofRun> {
  const candidate = parseCandidate(inputCandidate);
  assertEvaluatorIndependence(candidate, context.verifier);

  const budgetDissent = validateBudgetConfig(context.config, context.iterationsAttempted ?? 0);
  if (budgetDissent !== undefined) {
    return recordProofRun(
      buildProofRun({
        candidate,
        context,
        datasetId: "budget-guard",
        verdict: "fail",
        baselineScore: 0,
        candidateScore: 0,
        trials: 0,
        significance: 0,
        metric: "unresolved",
        regression: { skillsChecked: 0, regressions: [] },
        costUSD: 0,
        dissent: budgetDissent,
      }),
      context.recorder,
    );
  }

  const tasks = resolveHeldOutTasks(context.heldOutTasks);
  if (tasks.length === 0) {
    return recordProofRun(
      buildProofRun({
        candidate,
        context,
        datasetId: "no-valid-heldout-tasks",
        verdict: "fail",
        baselineScore: 0,
        candidateScore: 0,
        trials: 0,
        significance: 0,
        metric: "unresolved",
        regression: { skillsChecked: 0, regressions: [] },
        costUSD: 0,
        dissent: "no valid 'better' definition: held-out task set is empty, invalid, or leaked",
      }),
      context.recorder,
    );
  }

  const datasetId = buildDatasetId(tasks);
  const metric = tasks[0]?.metric ?? "task-success";
  const baseline = await runTrials(candidate, tasks, context, "baseline", 0);

  if (baseline.costUSD > context.config.maxCostUSD) {
    return recordProofRun(
      buildBudgetExceededRun(candidate, context, datasetId, metric, baseline, 0),
      context.recorder,
    );
  }

  const candidateScores = await runTrials(candidate, tasks, context, "candidate", baseline.costUSD);
  const costUSD = baseline.costUSD + candidateScores.costUSD;

  if (costUSD > context.config.maxCostUSD) {
    return recordProofRun(
      buildBudgetExceededRun(
        candidate,
        context,
        datasetId,
        metric,
        candidateScores,
        baseline.score,
      ),
      context.recorder,
    );
  }

  const delta = candidateScores.score - baseline.score;
  const generalization = calculateGeneralizationLift(
    tasks,
    baseline,
    candidateScores,
    context.config,
  );
  const significance = calculateSignificance(delta, context.config);
  const regression = runRegressionSuite(context.regression);

  if (regression === "failed-to-run") {
    return recordProofRun(
      buildProofRun({
        candidate,
        context,
        datasetId,
        verdict: "fail",
        baselineScore: baseline.score,
        candidateScore: candidateScores.score,
        trials: context.config.minTrials,
        significance,
        metric,
        regression: { skillsChecked: 0, regressions: [] },
        costUSD,
        dissent: "regression suite could not run; failing closed",
      }),
      context.recorder,
    );
  }

  if (!isSignificantlyBetter(delta, context.config)) {
    return recordProofRun(
      buildProofRun({
        candidate,
        context,
        datasetId,
        verdict: "fail",
        baselineScore: baseline.score,
        candidateScore: candidateScores.score,
        trials: context.config.minTrials,
        significance,
        metric,
        regression,
        costUSD,
        dissent: "candidate is not significantly better than baseline",
      }),
      context.recorder,
    );
  }

  if (!generalization.passed) {
    return recordProofRun(
      buildProofRun({
        candidate,
        context,
        datasetId,
        verdict: "fail",
        baselineScore: baseline.score,
        candidateScore: candidateScores.score,
        trials: context.config.minTrials,
        significance,
        metric,
        regression,
        costUSD,
        dissent: generalization.dissent,
      }),
      context.recorder,
    );
  }

  if (regression.regressions.length > 0) {
    return recordProofRun(
      buildProofRun({
        candidate,
        context,
        datasetId,
        verdict: "fail",
        baselineScore: baseline.score,
        candidateScore: candidateScores.score,
        trials: context.config.minTrials,
        significance,
        metric,
        regression,
        costUSD,
        dissent: "candidate regresses prior earned skills",
      }),
      context.recorder,
    );
  }

  return recordProofRun(
    buildProofRun({
      candidate,
      context,
      datasetId,
      verdict: "pass",
      baselineScore: baseline.score,
      candidateScore: candidateScores.score,
      trials: context.config.minTrials,
      significance,
      metric,
      regression,
      costUSD,
    }),
    context.recorder,
  );
}

function parseCandidate(candidate: Skill): Skill {
  const parsed = SkillSchema.safeParse(candidate);

  if (!parsed.success) {
    throw new SchemaValidationError("Candidate skill failed canonical schema validation", {
      cause: parsed.error,
    });
  }

  return parsed.data;
}

function assertEvaluatorIndependence(candidate: Skill, verifier: ProofProviderConfig): void {
  if (candidate.provenance.proposerConfigHash === verifier.configHash) {
    throw new ProofGateError(
      "Evaluator independence violated: verifier config hash matches proposer config hash",
    );
  }
}

function validateBudgetConfig(
  config: ProofGateConfig,
  iterationsAttempted: number,
): string | undefined {
  if (config.minTrials > config.maxTrials) {
    return "proof.minTrials exceeds budgets.maxTrials; proof cannot satisfy the trial floor";
  }

  if (iterationsAttempted > config.maxIterations) {
    return "maxIterations exceeded before proof could complete";
  }

  return undefined;
}

function resolveHeldOutTasks(tasks: HeldOutTask[]): HeldOutTask[] {
  return tasks.filter(isValidHeldOutTask);
}

function isValidHeldOutTask(task: HeldOutTask): boolean {
  if (task.leakedFromTraining === true) {
    return false;
  }

  return (
    task.id.trim().length > 0 &&
    task.metric.trim().length > 0 &&
    task.input.trim().length > 0 &&
    task.better.description.trim().length > 0 &&
    task.better.direction === "higher-score" &&
    (task.proofRole === undefined || task.proofRole === "exact" || task.proofRole === "adjacent")
  );
}

async function runTrials(
  candidate: Skill,
  tasks: HeldOutTask[],
  context: EvaluateProofGateContext,
  mode: ProofTrialRequest["mode"],
  startingCostUSD: number,
): Promise<TrialScores> {
  let scoreTotal = 0;
  let costUSD = 0;
  let trialsCompleted = 0;
  const taskTotals = new Map<string, number>();
  const taskCounts = new Map<string, number>();

  for (let trial = 0; trial < context.config.minTrials; trial += 1) {
    for (const task of tasks) {
      const result = await context.evaluator.score({
        candidate,
        task,
        mode,
        trial,
        proposer: context.proposer,
        verifier: context.verifier,
      });

      costUSD += result.costUSD;

      if (startingCostUSD + costUSD > context.config.maxCostUSD) {
        return {
          score: scoreTotal / Math.max(1, trialsCompleted * tasks.length),
          costUSD,
          trialsCompleted,
          taskScores: averageTaskScores(taskTotals, taskCounts),
        };
      }

      scoreTotal += result.score;
      taskTotals.set(task.id, (taskTotals.get(task.id) ?? 0) + result.score);
      taskCounts.set(task.id, (taskCounts.get(task.id) ?? 0) + 1);
    }

    trialsCompleted += 1;
  }

  return {
    score: scoreTotal / (context.config.minTrials * tasks.length),
    costUSD,
    trialsCompleted,
    taskScores: averageTaskScores(taskTotals, taskCounts),
  };
}

function averageTaskScores(
  taskTotals: Map<string, number>,
  taskCounts: Map<string, number>,
): Map<string, number> {
  const scores = new Map<string, number>();

  for (const [taskId, total] of taskTotals) {
    const count = taskCounts.get(taskId) ?? 0;
    if (count > 0) {
      scores.set(taskId, total / count);
    }
  }

  return scores;
}

function calculateSignificance(delta: number, config: ProofGateConfig): number {
  if (config.significance.method === "effect-size") {
    return delta;
  }

  return delta - config.significance.alpha;
}

function isSignificantlyBetter(delta: number, config: ProofGateConfig): boolean {
  if (config.significance.method === "effect-size") {
    return delta > config.significance.minEffect;
  }

  return delta > config.significance.minEffect + config.significance.alpha;
}

function calculateGeneralizationLift(
  tasks: HeldOutTask[],
  baseline: TrialScores,
  candidate: TrialScores,
  config: ProofGateConfig,
):
  | { passed: true; adjacentDelta: number }
  | { passed: false; adjacentDelta: number; dissent: string } {
  const adjacentTasks = tasks.filter((task) => task.proofRole !== "exact");

  if (adjacentTasks.length === 0) {
    return {
      passed: false,
      adjacentDelta: 0,
      dissent: "candidate has no adjacent held-out tasks for generalization proof",
    };
  }

  const adjacentDelta = averageDelta(adjacentTasks, baseline.taskScores, candidate.taskScores);
  const minLift = config.generalizationMinLift ?? 0.05;

  if (adjacentDelta < minLift) {
    return {
      passed: false,
      adjacentDelta,
      dissent: `candidate does not generalize to adjacent held-out tasks: adjacent lift ${adjacentDelta.toFixed(
        3,
      )} < generalizationMinLift ${minLift.toFixed(3)}`,
    };
  }

  return { passed: true, adjacentDelta };
}

function averageDelta(
  tasks: HeldOutTask[],
  baselineScores: Map<string, number>,
  candidateScores: Map<string, number>,
): number {
  let total = 0;

  for (const task of tasks) {
    total += (candidateScores.get(task.id) ?? 0) - (baselineScores.get(task.id) ?? 0);
  }

  return total / tasks.length;
}

function runRegressionSuite(regression: RegressionSuite):
  | {
      skillsChecked: number;
      regressions: { skillId: string; before: number; after: number }[];
    }
  | "failed-to-run" {
  if (regression.failToRun === true) {
    return "failed-to-run";
  }

  return {
    skillsChecked: regression.checks.length,
    regressions: regression.checks
      .filter((check) => check.afterScore < check.beforeScore)
      .map((check) => ({
        skillId: check.skillId,
        before: check.beforeScore,
        after: check.afterScore,
      })),
  };
}

function buildBudgetExceededRun(
  candidate: Skill,
  context: EvaluateProofGateContext,
  datasetId: string,
  metric: string,
  scores: TrialScores,
  baselineScore: number,
): ProofRun {
  return buildProofRun({
    candidate,
    context,
    datasetId,
    verdict: "fail",
    baselineScore,
    candidateScore: scores.score,
    trials: scores.trialsCompleted,
    significance: 0,
    metric,
    regression: { skillsChecked: 0, regressions: [] },
    costUSD: context.config.maxCostUSD + Number.EPSILON,
    dissent: "maxCostUSD exceeded before proof could complete",
  });
}

function buildProofRun(input: BuildProofRunInput): ProofRun {
  const timestamp = (input.context.now ?? (() => new Date()))().toISOString();
  const proofRun = {
    id: (input.context.idFactory ?? ulid)(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    skillId: input.candidate.id,
    verdict: input.verdict,
    manifest: {
      verifierConfigHash: input.context.verifier.configHash,
      models: [
        {
          role: "verifier",
          id: `${input.context.verifier.family}/${input.context.verifier.model}`,
          ...(input.context.verifier.seed === undefined
            ? {}
            : { seed: input.context.verifier.seed }),
        },
        {
          role: "baseline",
          id: `${input.context.baseline.family}/${input.context.baseline.model}`,
          ...(input.context.baseline.seed === undefined
            ? {}
            : { seed: input.context.baseline.seed }),
        },
      ],
      datasetId: input.datasetId,
      configHash: input.context.config.configHash,
      timestamp,
    },
    measurement: {
      baselineScore: input.baselineScore,
      candidateScore: input.candidateScore,
      delta: input.candidateScore - input.baselineScore,
      trials: input.trials,
      significance: input.significance,
      metric: input.metric,
    },
    regression: input.regression,
    ...(input.dissent === undefined ? {} : { dissent: input.dissent }),
    costUSD: input.costUSD,
  };

  return ProofRunSchema.parse(proofRun);
}

async function recordProofRun(proofRun: ProofRun, recorder: ProofRunRecorder): Promise<ProofRun> {
  await recorder.write(proofRun);

  return proofRun;
}

function buildDatasetId(tasks: HeldOutTask[]): string {
  return `heldout:${tasks.map((task) => task.id).join("+")}`;
}
