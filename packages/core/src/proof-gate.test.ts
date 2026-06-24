import { CURRENT_SCHEMA_VERSION, type Skill } from "@ratchet/schema";
import { describe, expect, it } from "vitest";
import { ProofGateError } from "./errors.js";
import {
  createMemoryProofRunRecorder,
  type EvaluateProofGateContext,
  evaluateProofGate,
  type HeldOutTask,
  type ProofGateConfig,
  type ProofProviderConfig,
  type ProofTrialEvaluator,
} from "./proof-gate.js";

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

const heldOutTask: HeldOutTask = {
  id: "task-typescript-boundaries",
  source: "user",
  metric: "task-success",
  input: "Refactor a proof-gate function without mixing I/O into domain logic.",
  better: {
    description: "The candidate produces a cleaner, independently testable module.",
    direction: "higher-score",
  },
};

const proposer: ProofProviderConfig = {
  id: "proposer",
  family: "openai",
  model: "proposal-model",
  configHash: "proposer-config-hash",
  seed: 7,
};

const verifier: ProofProviderConfig = {
  id: "verifier",
  family: "anthropic",
  model: "verifier-model",
  configHash: "verifier-config-hash",
  seed: 11,
};

const baseline: ProofProviderConfig = {
  id: "baseline",
  family: "local",
  model: "baseline-agent",
  configHash: "baseline-config-hash",
  seed: 13,
};

const config: ProofGateConfig = {
  minTrials: 5,
  maxTrials: 5,
  maxCostUSD: 1,
  maxIterations: 3,
  generalizationMinLift: 0.05,
  significance: {
    method: "effect-size",
    alpha: 0.05,
    minEffect: 0.1,
  },
  configHash: "proof-config-hash-generalization-0.05",
};

function createEvaluator(scores: { baseline: number; candidate: number; costUSD?: number }) {
  const evaluator: ProofTrialEvaluator = {
    async score(request) {
      return {
        score: scores[request.mode],
        costUSD: scores.costUSD ?? 0.001,
      };
    },
  };

  return evaluator;
}

function createTaskAwareEvaluator(scores: {
  baseline: number;
  candidateByTask: Record<string, number>;
  costUSD?: number;
}) {
  const evaluator: ProofTrialEvaluator = {
    async score(request) {
      return {
        score:
          request.mode === "baseline"
            ? scores.baseline
            : (scores.candidateByTask[request.task.id] ?? scores.baseline),
        costUSD: scores.costUSD ?? 0.001,
      };
    },
  };

  return evaluator;
}

function createContext(
  overrides: Partial<EvaluateProofGateContext> = {},
): EvaluateProofGateContext {
  const recorder = createMemoryProofRunRecorder();

  return {
    heldOutTasks: [heldOutTask],
    proposer,
    verifier,
    baseline,
    config,
    evaluator: createEvaluator({ baseline: 0.5, candidate: 0.75 }),
    regression: { checks: [] },
    recorder,
    idFactory: () => "proof-run-001",
    now: () => fixedDate,
    ...overrides,
  };
}

describe("evaluateProofGate", () => {
  it("passes and records a complete ProofRun when the candidate clears the gate", async () => {
    const recorder = createMemoryProofRunRecorder();
    const proofRun = await evaluateProofGate(candidate, createContext({ recorder }));

    expect(proofRun.verdict).toBe("pass");
    expect(proofRun.measurement.trials).toBe(5);
    expect(proofRun.measurement.delta).toBeCloseTo(0.25);
    expect(proofRun.manifest.verifierConfigHash).toBe("verifier-config-hash");
    expect(proofRun.manifest.models.map((model) => model.role).sort()).toEqual([
      "baseline",
      "verifier",
    ]);
    expect(recorder.proofRuns).toHaveLength(1);
    expect(recorder.proofRuns[0]).toEqual(proofRun);
  });

  it("fails closed when no valid held-out task defines better", async () => {
    const proofRun = await evaluateProofGate(candidate, createContext({ heldOutTasks: [] }));

    expect(proofRun.verdict).toBe("fail");
    expect(proofRun.dissent).toMatch(/no valid 'better' definition/i);
    expect(proofRun.measurement.trials).toBe(0);
  });

  it("rejects within-noise deltas that do not clear the significance bar", async () => {
    const proofRun = await evaluateProofGate(
      candidate,
      createContext({
        evaluator: createEvaluator({ baseline: 0.5, candidate: 0.55 }),
      }),
    );

    expect(proofRun.verdict).toBe("fail");
    expect(proofRun.dissent).toMatch(/not significantly better/i);
  });

  it("rejects teaching-to-the-test candidates with exact-task lift but no adjacent lift", async () => {
    const exactTask: HeldOutTask = {
      ...heldOutTask,
      id: "task-exact",
      proofRole: "exact",
    };
    const adjacentTaskA: HeldOutTask = {
      ...heldOutTask,
      id: "task-adjacent-a",
      proofRole: "adjacent",
    };
    const adjacentTaskB: HeldOutTask = {
      ...heldOutTask,
      id: "task-adjacent-b",
      proofRole: "adjacent",
    };
    const proofRun = await evaluateProofGate(
      candidate,
      createContext({
        heldOutTasks: [exactTask, adjacentTaskA, adjacentTaskB],
        evaluator: createTaskAwareEvaluator({
          baseline: 0.5,
          candidateByTask: {
            [exactTask.id]: 1,
            [adjacentTaskA.id]: 0.5,
            [adjacentTaskB.id]: 0.5,
          },
        }),
      }),
    );

    expect(proofRun.measurement.delta).toBeGreaterThan(config.significance.minEffect);
    expect(proofRun.verdict).toBe("fail");
    expect(proofRun.dissent).toMatch(/does not generalize to adjacent held-out tasks/i);
  });

  it("asserts evaluator independence before running proof", async () => {
    await expect(
      evaluateProofGate(
        candidate,
        createContext({
          verifier: {
            ...verifier,
            configHash: candidate.provenance.proposerConfigHash,
          },
        }),
      ),
    ).rejects.toBeInstanceOf(ProofGateError);
  });

  it("rejects any regression over earned skills", async () => {
    const proofRun = await evaluateProofGate(
      candidate,
      createContext({
        regression: {
          checks: [{ skillId: "earned-skill-001", beforeScore: 1, afterScore: 0.8 }],
        },
      }),
    );

    expect(proofRun.verdict).toBe("fail");
    expect(proofRun.regression.regressions).toEqual([
      { skillId: "earned-skill-001", before: 1, after: 0.8 },
    ]);
    expect(proofRun.dissent).toMatch(/regresses prior earned skills/i);
  });

  it("fails closed when the regression suite cannot run", async () => {
    const proofRun = await evaluateProofGate(
      candidate,
      createContext({
        regression: { checks: [], failToRun: true },
      }),
    );

    expect(proofRun.verdict).toBe("fail");
    expect(proofRun.dissent).toMatch(/regression suite could not run/i);
  });

  it("honors maxTrials and maxIterations guards before proof work", async () => {
    const proofRun = await evaluateProofGate(
      candidate,
      createContext({
        config: {
          ...config,
          minTrials: 6,
          maxTrials: 5,
        },
        iterationsAttempted: 4,
      }),
    );

    expect(proofRun.verdict).toBe("fail");
    expect(proofRun.dissent).toMatch(/minTrials exceeds/i);
  });

  it("fails closed when evaluation cost exceeds maxCostUSD", async () => {
    const proofRun = await evaluateProofGate(
      candidate,
      createContext({
        config: {
          ...config,
          maxCostUSD: 0.5,
        },
        evaluator: createEvaluator({ baseline: 0.5, candidate: 0.75, costUSD: 0.2 }),
      }),
    );

    expect(proofRun.verdict).toBe("fail");
    expect(proofRun.dissent).toMatch(/maxCostUSD exceeded/i);
  });
});
