import { type LedgerSummary, summarizeLedger } from "./ledger.js";
import {
  type LearningCycleOptions,
  type LearningCycleResult,
  runLearningCycle,
} from "./pipeline.js";
import type { ProofTrialEvaluator } from "./proof-gate.js";
import type { CompletionRequest, CompletionResult, ModelProvider } from "./provider.js";

type DemoNote = {
  title: string;
  body: string;
  kind: "summary" | "decision" | "gotcha" | "preference";
};

type DemoTask = {
  input: string;
  metric: string;
  betterDescription: string;
  source: "user" | "mined" | "synthesized" | "hybrid";
};

type DemoSkillCandidate = {
  name: string;
  kind: "preference" | "procedure" | "fact" | "heuristic" | "constraint";
  body: string;
  applicability: {
    description: string;
    triggers: string[];
    scope: "global" | "repo" | "language" | "task";
  };
  proofTasks: {
    exact: DemoTask[];
    adjacent: DemoTask[];
  };
};

export interface DeterministicDemoStep {
  id: string;
  sourceSessionId: string;
  transcript: string;
  note: DemoNote;
  candidate: DemoSkillCandidate;
  yardstickScore: number;
  now: Date;
}

export interface DeterministicDemoSnapshot {
  stepId: string;
  summary: LedgerSummary;
}

export interface DeterministicDemoSequenceResult {
  results: LearningCycleResult[];
  snapshots: DeterministicDemoSnapshot[];
  summary: LedgerSummary;
}

const DB_MIGRATION_STEP: DeterministicDemoStep = {
  id: "db-migration",
  sourceSessionId: "demo-session-db-migration",
  transcript: [
    "User: The integration tests failed with `column users.role does not exist` after I added a migration.",
    "Assistant: I ran the database migrations, then reran the tests.",
    "Tool: pnpm test passed after the migration was applied.",
    "User: Capture that for next time.",
  ].join("\n"),
  note: {
    title: "Run database migrations before tests",
    body: [
      "The integration suite can fail after schema changes if the local database has not been migrated.",
      "",
      "Run the database migration command before rerunning tests when errors mention missing columns or stale schema.",
    ].join("\n"),
    kind: "gotcha",
  },
  candidate: {
    name: "Run database migrations before tests",
    kind: "procedure",
    body: "When tests fail with missing-column or stale-schema database errors after a schema change, run the database migrations before rerunning the test suite.",
    applicability: {
      description: "Database-backed test failures after schema or migration changes.",
      triggers: ["missing column", "schema", "migration", "database tests"],
      scope: "repo",
    },
    proofTasks: {
      exact: [
        {
          input:
            "A transcript shows `column users.role does not exist` after a schema change. What should the agent do before rerunning tests?",
          metric: "task-success",
          betterDescription:
            "The answer should identify the stale database schema and run migrations before rerunning tests.",
          source: "user",
        },
      ],
      adjacent: [
        {
          input:
            "Integration tests fail with a missing `accounts.plan` column after a migration was added. What is the next verification step?",
          metric: "task-success",
          betterDescription:
            "The answer should generalize to running or checking migrations before rerunning the test suite.",
          source: "hybrid",
        },
        {
          input:
            "A local database-backed test suite fails immediately after a schema migration lands. What should the agent check before debugging application code?",
          metric: "task-success",
          betterDescription:
            "The answer should recommend migrating or validating the local database schema first.",
          source: "hybrid",
        },
      ],
    },
  },
  yardstickScore: 0.4,
  now: new Date("2026-06-24T12:00:00.000Z"),
};

const QUOTED_PATH_STEP: DeterministicDemoStep = {
  id: "quoted-paths",
  sourceSessionId: "demo-session-quoted-paths",
  transcript: [
    "User: zsh throws `no matches found: src/app/players/[id]/page.tsx` when I try to read a dynamic route.",
    "Assistant: I quoted the bracketed path before reading it.",
    "Tool: sed -n '1,120p' 'src/app/players/[id]/page.tsx' worked.",
    "User: Remember that shell path issue.",
  ].join("\n"),
  note: {
    title: "Quote shell paths with brackets",
    body: [
      "Shells can expand bracketed route segments before a file-reading command sees them.",
      "",
      "Quote paths that contain brackets or spaces before passing them to shell commands.",
    ].join("\n"),
    kind: "gotcha",
  },
  candidate: {
    name: "Quote bracketed shell paths",
    kind: "procedure",
    body: "When reading files through a shell, quote paths that contain brackets, spaces, or glob-like route segments so the shell does not expand them before the command runs.",
    applicability: {
      description:
        "Shell commands that read or inspect paths containing brackets, spaces, or glob-like route segments.",
      triggers: ["zsh: no matches found", "[id]", "bracketed path", "spaces in path"],
      scope: "repo",
    },
    proofTasks: {
      exact: [
        {
          input:
            "zsh reports `no matches found: src/app/players/[id]/page.tsx` when reading a Next.js dynamic route. What should the agent do?",
          metric: "task-success",
          betterDescription:
            "The answer should quote the path before passing it to the shell command.",
          source: "user",
        },
      ],
      adjacent: [
        {
          input:
            "A command must inspect `docs/My Report.md`, but the shell splits the path. What is the safe command habit?",
          metric: "task-success",
          betterDescription:
            "The answer should recommend quoting or otherwise safely escaping paths with spaces.",
          source: "hybrid",
        },
        {
          input:
            "A file path includes glob-like brackets and the shell expands it before `sed` runs. What should happen first?",
          metric: "task-success",
          betterDescription:
            "The answer should generalize to quoting bracketed shell paths before file inspection.",
          source: "hybrid",
        },
      ],
    },
  },
  yardstickScore: 0.7,
  now: new Date("2026-06-24T12:01:00.000Z"),
};

const RIPGREP_STEP: DeterministicDemoStep = {
  id: "ripgrep-first",
  sourceSessionId: "demo-session-ripgrep-first",
  transcript: [
    "User: I need to find where the ledger card renders the skill count.",
    "Assistant: I used `rg` to search the repo before opening files.",
    'Tool: rg -n "skills earned|improvement" packages docs',
    "User: Keep using that search pattern.",
  ].join("\n"),
  note: {
    title: "Search with rg first",
    body: [
      "`rg` is the fastest first pass for finding code and docs in this repository.",
      "",
      "Search with `rg` before falling back to slower or broader commands.",
    ].join("\n"),
    kind: "preference",
  },
  candidate: {
    name: "Use rg for repo search first",
    kind: "procedure",
    body: "When looking for code, docs, or symbols in a repository, use `rg` or `rg --files` first, then open the smallest relevant files.",
    applicability: {
      description: "Repository search, source tracing, and file discovery tasks.",
      triggers: ["find where", "search repo", "which file", "rg --files"],
      scope: "repo",
    },
    proofTasks: {
      exact: [
        {
          input:
            "A user asks where the ledger card renders the skill count. What should the agent do before opening files?",
          metric: "task-success",
          betterDescription:
            "The answer should use `rg` to locate the relevant code before reading files.",
          source: "user",
        },
      ],
      adjacent: [
        {
          input:
            "A repository has many packages and the agent needs the source of a CLI command. What is the efficient first search step?",
          metric: "task-success",
          betterDescription:
            "The answer should recommend `rg` or `rg --files` as the first search step.",
          source: "hybrid",
        },
        {
          input:
            "Before editing a code path, the agent needs all direct references to a function name. Which search habit should it use?",
          metric: "task-success",
          betterDescription: "The answer should generalize to ripgrep-based source tracing.",
          source: "hybrid",
        },
      ],
    },
  },
  yardstickScore: 1,
  now: new Date("2026-06-24T12:02:00.000Z"),
};

export const DETERMINISTIC_DEMO_STEPS = [
  DB_MIGRATION_STEP,
  QUOTED_PATH_STEP,
  RIPGREP_STEP,
] as const;

export const DETERMINISTIC_DEMO_TRANSCRIPT = DB_MIGRATION_STEP.transcript;

export class DeterministicDemoProvider implements ModelProvider {
  readonly id = "deterministic-demo-provider";

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    const step = findDemoStep(request.metadata.sourceSessionId);

    if (request.responseFormat.schemaName === "DistilledNoteContent") {
      return { output: step.note };
    }

    if (request.responseFormat.schemaName === "DistilledSkillCandidates") {
      return {
        output: {
          candidates: [step.candidate],
        },
      };
    }

    return { output: { candidates: [] } };
  }
}

export async function runDeterministicDemoSequence(options: {
  vaultRoot: string;
  promote?: boolean;
  dryRun?: boolean;
  provider?: DeterministicDemoProvider;
}): Promise<DeterministicDemoSequenceResult> {
  const provider = options.provider ?? new DeterministicDemoProvider();
  const results: LearningCycleResult[] = [];
  const snapshots: DeterministicDemoSnapshot[] = [];

  for (const step of DETERMINISTIC_DEMO_STEPS) {
    const cycleOptions: LearningCycleOptions = {
      vaultRoot: options.vaultRoot,
      noteProvider: provider,
      skillProvider: provider,
      proofEvaluator: createDeterministicDemoProofEvaluator(),
      proposer: DETERMINISTIC_DEMO_PROVIDERS.proposer,
      verifier: DETERMINISTIC_DEMO_PROVIDERS.verifier,
      baseline: DETERMINISTIC_DEMO_PROVIDERS.baseline,
      proofConfig: DETERMINISTIC_DEMO_PROOF_CONFIG,
      promote: options.promote ?? true,
      dryRun: options.dryRun ?? false,
      idFactory: createDeterministicDemoStepIdFactory(step.id),
      now: () => step.now,
      benchmarkScore: () => step.yardstickScore,
    };

    results.push(
      await runLearningCycle(
        {
          sourceSessionId: step.sourceSessionId,
          transcript: step.transcript,
        },
        cycleOptions,
      ),
    );

    if (options.dryRun !== true) {
      snapshots.push({
        stepId: step.id,
        summary: await summarizeLedger(options.vaultRoot),
      });
    }
  }

  return {
    results,
    snapshots,
    summary:
      options.dryRun === true ? emptyDemoSummary() : await summarizeLedger(options.vaultRoot),
  };
}

export function createDeterministicDemoProofEvaluator(): ProofTrialEvaluator {
  return {
    async score(request) {
      if (request.mode === "baseline") {
        return { score: 0.45, costUSD: 0 };
      }

      return {
        score: skillMatchesTask(request.candidate.name, request.task.input) ? 0.78 : 0.46,
        costUSD: 0,
      };
    },
  };
}

export const DETERMINISTIC_DEMO_PROVIDERS = {
  proposer: {
    id: "deterministic-demo-proposer",
    family: "deterministic",
    model: "demo-distiller",
    configHash: "deterministic-demo-proposer-config",
    seed: 101,
  },
  verifier: {
    id: "deterministic-demo-verifier",
    family: "deterministic",
    model: "demo-verifier",
    configHash: "deterministic-demo-verifier-config",
    seed: 202,
  },
  baseline: {
    id: "deterministic-demo-baseline",
    family: "deterministic",
    model: "demo-baseline",
    configHash: "deterministic-demo-baseline-config",
    seed: 303,
  },
} as const;

export const DETERMINISTIC_DEMO_PROOF_CONFIG = {
  minTrials: 5,
  maxTrials: 5,
  maxCostUSD: 0.01,
  maxIterations: 1,
  generalizationMinLift: 0.05,
  significance: {
    method: "effect-size" as const,
    alpha: 0.05,
    minEffect: 0.1,
  },
  configHash: "deterministic-demo-proof-config-generalization-0.05",
};

function findDemoStep(sourceSessionId: string): DeterministicDemoStep {
  return (
    DETERMINISTIC_DEMO_STEPS.find((step) => step.sourceSessionId === sourceSessionId) ??
    DB_MIGRATION_STEP
  );
}

function skillMatchesTask(skillName: string, taskInput: string): boolean {
  const normalizedSkillName = skillName.toLowerCase();
  const normalizedTask = taskInput.toLowerCase();

  if (normalizedSkillName.includes("database")) {
    return includesAny(normalizedTask, ["migration", "schema", "missing"]);
  }

  if (normalizedSkillName.includes("bracketed")) {
    return includesAny(normalizedTask, ["zsh", "bracket", "[id]", "space", "path", "shell"]);
  }

  if (normalizedSkillName.includes("rg")) {
    return includesAny(normalizedTask, ["rg", "ripgrep", "search", "repository", "repo"]);
  }

  return false;
}

function includesAny(value: string, needles: string[]): boolean {
  return needles.some((needle) => value.includes(needle));
}

function createDeterministicDemoStepIdFactory(stepId: string): (label: string) => string {
  const prefixByStep: Record<string, string> = {
    "db-migration": "db-migration",
    "quoted-paths": "quoted-paths",
    "ripgrep-first": "ripgrep-first",
  };
  const suffix = prefixByStep[stepId] ?? stepId.replace(/[^a-z0-9]+/g, "-");

  return (label) => {
    const stableIds: Record<string, string> = {
      note: `demo-note-${suffix}`,
      "skill-0": `demo-skill-${suffix}`,
      [`proof-demo-skill-${suffix}`]: `demo-proof-${suffix}`,
      [`ledger-demo-skill-${suffix}`]: `demo-ledger-${suffix}`,
    };

    return stableIds[label] ?? `demo-${suffix}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  };
}

function emptyDemoSummary(): LedgerSummary {
  return {
    earnedSkills: [],
    curve: [],
    level: 0,
    improvementPct: 0,
    regressionEvents: 0,
  };
}
