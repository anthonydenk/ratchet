import { readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import {
  createDeterministicDemoProofEvaluator,
  DETERMINISTIC_DEMO_PROOF_CONFIG,
  DETERMINISTIC_DEMO_PROVIDERS,
  type DeterministicDemoSequenceResult,
  distill,
  distillSkillCandidates,
  initializeVault,
  type LearningCycleResult,
  OpenAIModelProvider,
  type ProofGateConfig,
  type ProofProviderConfig,
  RatchetError,
  readEarnedSkills,
  renderLedger,
  runDeterministicDemoSequence,
  runLearningCycle,
  summarizeLedger,
  writeCandidateSkillToVault,
  writeLedgerCard,
  writeNoteToVault,
} from "@ratchet/core";
import { Command } from "commander";
import { config as loadDotenv } from "dotenv";

interface Writable {
  write(message: string): unknown;
}

interface CliIO {
  stdout: Writable;
  stderr: Writable;
}

interface GlobalOptions {
  vault?: string;
  config?: string;
  json?: boolean;
  quiet?: boolean;
  verbose?: number;
  color?: boolean;
  dryRun?: boolean;
  yes?: boolean;
}

interface InitCommandOptions {
  vault?: string;
  host?: string;
  obsidian?: boolean;
  force?: boolean;
}

interface WatchCommandOptions {
  input?: string;
  sessionId?: string;
  once?: boolean;
  since?: string;
  distillOnly?: boolean;
  prove?: boolean;
  maxCostUsd?: string;
  maxTrials?: string;
  maxIterations?: string;
  promote?: boolean;
}

interface DemoCommandOptions {
  promote?: boolean;
}

interface LedgerCommandOptions {
  card?: boolean;
  out?: string;
  format?: "svg" | "md";
}

interface TranscriptInput {
  transcript: string;
  sourceSessionId?: string;
}

const defaultIo: CliIO = {
  stdout: process.stdout,
  stderr: process.stderr,
};

export function createProgram(io: CliIO = defaultIo): Command {
  const program = new Command();

  program
    .name("ratchet")
    .description("Local-first verified continual-learning layer for AI agents")
    .version("0.1.0")
    .option("--vault <path>", "override vault path")
    .option("--config <path>", "explicit config file")
    .option("--json", "emit machine-readable JSON")
    .option("-q, --quiet", "suppress non-error stderr chatter")
    .option("-v, --verbose", "increase diagnostic detail", incrementVerbosity, 0)
    .option("--no-color", "disable ANSI color")
    .option("--dry-run", "plan only; perform no writes")
    .option("-y, --yes", "assume yes to confirmation prompts");

  program
    .command("init")
    .description("Scaffold a Ratchet markdown vault")
    .argument("[path]", "vault path")
    .option("--vault <path>", "where the markdown vault lives")
    .option("--host <id>", "host agent adapter id")
    .option("--obsidian", "include Obsidian-friendly layout hints")
    .option("--force", "re-scaffold managed regions")
    .action(
      async (targetPath: string | undefined, options: InitCommandOptions, command: Command) => {
        const globals = getGlobalOptions(command);
        const vaultPath = options.vault ?? globals.vault ?? targetPath ?? "./vault";

        try {
          const writes = [
            `${vaultPath}/notes`,
            `${vaultPath}/skills`,
            `${vaultPath}/.ratchet/cards`,
            `${vaultPath}/.ratchet/ledger`,
            `${vaultPath}/.ratchet/proofs`,
            `${vaultPath}/.ratchet/skills`,
            `${vaultPath}/.ratchet/candidates`,
            `${vaultPath}/.ratchet/manifests`,
            ".env.example",
          ];

          if (!(globals.dryRun ?? false)) {
            await initializeVault(vaultPath);
            await writeEnvExample({ force: options.force ?? false });
          }

          const result = {
            command: "init",
            status: globals.dryRun ? "planned" : "initialized",
            vaultPath,
            host: options.host ?? "manual",
            writes,
            obsidian: options.obsidian ?? false,
            force: options.force ?? false,
            dryRun: globals.dryRun ?? false,
          };

          writeResult(io, globals, result, `Ratchet vault initialized at ${vaultPath}.`);
        } catch (error) {
          command.error(formatCliError(error), { exitCode: exitCodeForError(error) });
        }
      },
    );

  program
    .command("watch")
    .description("Watch sessions and run capture -> distill -> prove -> promote")
    .option("--input <file>", "read a transcript from a file, or '-' for stdin")
    .option("--session-id <id>", "override the source session id")
    .option("--once", "process the most recent session and exit")
    .option("--since <when>", "backfill sessions since a time or cursor")
    .option("--distill-only", "stop after distillation; never invoke the gate")
    .option("--prove", "run the proof gate on distilled candidate skills")
    .option("--max-cost-usd <n>", "per-run cost ceiling")
    .option("--max-trials <n>", "per-evaluation trial cap")
    .option("--max-iterations <n>", "self-rewrite iteration cap")
    .option("--no-promote", "do not write promotions")
    .action(async (options: WatchCommandOptions, command: Command) => {
      const globals = getGlobalOptions(command);

      try {
        loadDotenv({ quiet: true });

        const input = await readTranscript(options.input);
        const sourceSessionId =
          options.sessionId ??
          input.sourceSessionId ??
          buildSourceSessionId(options.input, input.transcript.length);
        const vaultRoot = globals.vault ?? "./vault";
        const provider = OpenAIModelProvider.fromEnv();

        if (options.prove && options.distillOnly !== true) {
          const result = await runLearningCycle(
            {
              sourceSessionId,
              transcript: input.transcript,
            },
            {
              vaultRoot,
              noteProvider: provider,
              skillProvider: provider,
              proofEvaluator: createDeterministicDemoProofEvaluator(),
              proposer: buildOpenAiProposerConfig(provider),
              verifier: DETERMINISTIC_DEMO_PROVIDERS.verifier,
              baseline: DETERMINISTIC_DEMO_PROVIDERS.baseline,
              proofConfig: buildProofConfig(options),
              promote: options.promote ?? true,
              dryRun: globals.dryRun ?? false,
            },
          );
          const formatted = formatLearningCycleResult(result);
          const humanMessage = formatLearningCycleHuman(result);

          writeResult(io, globals, formatted, humanMessage);

          if (result.proofResults.some((proofResult) => proofResult.proofRun.verdict === "fail")) {
            process.exitCode = 5;
          }

          return;
        }

        const note = await distill(
          {
            sourceSessionId,
            transcript: input.transcript,
          },
          { provider },
        );
        const candidates = await distillSkillCandidates(
          {
            sourceSessionId,
            transcript: input.transcript,
          },
          {
            provider,
            proposerConfigHash: buildOpenAiProposerConfig(provider).configHash,
          },
        );
        const written = globals.dryRun
          ? { note, absolutePath: "", markdown: "" }
          : await writeNoteToVault(note, { vaultRoot });

        if (!(globals.dryRun ?? false)) {
          for (const candidate of candidates) {
            await writeCandidateSkillToVault(candidate.skill, vaultRoot);
          }
        }

        const result = {
          sessionId: sourceSessionId,
          notes: [
            {
              id: written.note.id,
              vaultPath: written.note.vaultPath,
            },
          ],
          candidates: candidates.map((candidate) => ({
            id: candidate.skill.id,
            name: candidate.skill.name,
            status: candidate.skill.status,
            heldOutTasks: candidate.heldOutTasks.length,
          })),
          proofRuns: [],
          promoted: [],
          costUSD: 0,
          dryRun: globals.dryRun ?? false,
        };
        const humanPath = globals.dryRun ? written.note.vaultPath : written.absolutePath;

        writeResult(
          io,
          globals,
          result,
          `Wrote Ratchet Note and ${candidates.length} candidate skill(s): ${humanPath}`,
        );
      } catch (error) {
        command.error(formatCliError(error), { exitCode: exitCodeForError(error) });
      }
    });

  program
    .command("demo")
    .description("Run the deterministic offline capture -> distill -> prove -> promote demo")
    .option("--no-promote", "run the gate but do not write the earned skill")
    .action(async (options: DemoCommandOptions, command: Command) => {
      const globals = getGlobalOptions(command);
      const vaultRoot = globals.vault ?? "./vault";

      try {
        const sequence = await runDeterministicDemoSequence({
          vaultRoot,
          promote: options.promote ?? true,
          dryRun: globals.dryRun ?? false,
        });
        const formatted = formatDeterministicDemoSequence(sequence);
        const humanMessage = formatDeterministicDemoHuman(sequence);

        writeResult(io, globals, formatted, humanMessage);

        if (
          sequence.results.some((result) =>
            result.proofResults.some((proofResult) => proofResult.proofRun.verdict === "fail"),
          )
        ) {
          process.exitCode = 5;
        }
      } catch (error) {
        command.error(formatCliError(error), { exitCode: exitCodeForError(error) });
      }
    });

  program
    .command("ledger")
    .description("Show earned skills and render the level-up card")
    .option("--card", "generate the shareable level-up card")
    .option("--out <path>", "output path for --card")
    .option("--format <format>", "card format: svg or md", "svg")
    .action(async (options: LedgerCommandOptions, command: Command) => {
      const globals = getGlobalOptions(command);
      const vaultRoot = globals.vault ?? "./vault";

      try {
        if (options.card) {
          const format = parseCardFormat(options.format);
          const card = await writeLedgerCard({
            vaultRoot,
            format,
            ...(options.out === undefined ? {} : { outPath: options.out }),
          });
          const result = {
            path: card.path,
            format,
            earnedSkills: card.summary.earnedSkills.length,
            level: card.summary.level,
            latest: card.summary.latest?.skill.name,
          };

          writeResult(io, globals, result, `Wrote Ratchet level-up card: ${card.path}`);
          return;
        }

        const summary = await summarizeLedger(vaultRoot);
        const result = {
          earnedSkills: (await readEarnedSkills(vaultRoot)).map((earned) => ({
            skillId: earned.skill.id,
            name: earned.skill.name,
            status: earned.skill.status,
            proofRunId: earned.proofRun.id,
            verdict: earned.proofRun.verdict,
            delta: earned.proofRun.measurement.delta,
            confidence: earned.skill.trust.confidence,
            benchmarkScore: earned.entry.benchmarkScore,
          })),
          curve: summary.curve,
          level: summary.level,
          improvementPct: summary.improvementPct,
        };

        writeResult(io, globals, result, renderLedger(summary));
      } catch (error) {
        command.error(formatCliError(error), { exitCode: exitCodeForError(error) });
      }
    });

  return program;
}

function incrementVerbosity(_value: string, previous: number): number {
  return previous + 1;
}

function getGlobalOptions(command: Command): GlobalOptions {
  return command.parent?.opts<GlobalOptions>() ?? {};
}

function writeResult(
  io: CliIO,
  globals: GlobalOptions,
  data: Record<string, unknown>,
  humanMessage: string,
): void {
  if (globals.json) {
    io.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
    return;
  }

  io.stdout.write(`${humanMessage}\n`);
}

async function readTranscript(inputPath: string | undefined): Promise<TranscriptInput> {
  if (inputPath !== undefined && inputPath !== "-") {
    return parseTranscriptInput(await readFile(inputPath, "utf8"));
  }

  if (process.stdin.isTTY && inputPath === undefined) {
    throw new Error("ratchet watch requires --input <file> or --input - for stdin.");
  }

  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  return parseTranscriptInput(Buffer.concat(chunks).toString("utf8"));
}

function parseTranscriptInput(raw: string): TranscriptInput {
  const parsed = parseJsonObject(raw);

  if (
    parsed !== undefined &&
    typeof parsed.transcript === "string" &&
    parsed.transcript.trim().length > 0
  ) {
    const input: TranscriptInput = { transcript: parsed.transcript };

    if (typeof parsed.id === "string") {
      input.sourceSessionId = parsed.id;
    }

    return input;
  }

  return { transcript: raw };
}

function parseJsonObject(raw: string): Record<string, unknown> | undefined {
  try {
    const parsed: unknown = JSON.parse(raw);

    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }

    return undefined;
  } catch {
    return undefined;
  }
}

function buildSourceSessionId(inputPath: string | undefined, transcriptLength: number): string {
  if (inputPath !== undefined && inputPath !== "-") {
    return `file:${basename(inputPath)}`;
  }

  return `stdin:${transcriptLength}`;
}

function buildOpenAiProposerConfig(provider: OpenAIModelProvider): ProofProviderConfig {
  const model = provider.id.replace(/^openai:/, "");

  return {
    id: "openai-proposer",
    family: "openai",
    model,
    configHash: `openai-proposer:${provider.id}`,
  };
}

function buildProofConfig(options: WatchCommandOptions): ProofGateConfig {
  const maxTrials =
    options.maxTrials === undefined
      ? DETERMINISTIC_DEMO_PROOF_CONFIG.maxTrials
      : parseIntegerOption(options.maxTrials, "--max-trials");

  return {
    ...DETERMINISTIC_DEMO_PROOF_CONFIG,
    significance: { ...DETERMINISTIC_DEMO_PROOF_CONFIG.significance },
    maxTrials,
    maxCostUSD:
      options.maxCostUsd === undefined
        ? DETERMINISTIC_DEMO_PROOF_CONFIG.maxCostUSD
        : parseNumberOption(options.maxCostUsd, "--max-cost-usd"),
    maxIterations:
      options.maxIterations === undefined
        ? DETERMINISTIC_DEMO_PROOF_CONFIG.maxIterations
        : parseIntegerOption(options.maxIterations, "--max-iterations"),
  };
}

function parseNumberOption(raw: string, flag: string): number {
  const value = Number(raw);

  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${flag} must be a non-negative number`);
  }

  return value;
}

function parseIntegerOption(raw: string, flag: string): number {
  const value = Number(raw);

  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${flag} must be a non-negative integer`);
  }

  return value;
}

function parseCardFormat(format: string | undefined): "svg" | "md" {
  if (format === undefined || format === "svg" || format === "md") {
    return format ?? "svg";
  }

  throw new Error("--format must be svg or md");
}

function formatLearningCycleResult(result: LearningCycleResult): Record<string, unknown> {
  return {
    sessionId: result.sessionId,
    notes: result.notes.map((note) => ({
      id: note.id,
      vaultPath: note.vaultPath,
      promotedToSkill: note.promotedToSkill,
    })),
    candidates: result.candidates.map((candidate) => ({
      id: candidate.skill.id,
      name: candidate.skill.name,
      status: candidate.skill.status,
      heldOutTasks: candidate.heldOutTasks.length,
    })),
    proofRuns: result.proofResults.map((proofResult) => ({
      id: proofResult.proofRun.id,
      skillId: proofResult.proofRun.skillId,
      verdict: proofResult.proofRun.verdict,
      delta: proofResult.proofRun.measurement.delta,
      confidence: Math.min(1, Math.max(0, 0.5 + proofResult.proofRun.measurement.delta)),
      trials: proofResult.proofRun.measurement.trials,
      significance: proofResult.proofRun.measurement.significance,
      costUSD: proofResult.proofRun.costUSD,
      dissent: proofResult.proofRun.dissent,
    })),
    promoted: result.promoted.map((promotion) => ({
      skillId: promotion.skill.id,
      name: promotion.skill.name,
      proofRunId: promotion.ledgerEntry.proofRunId,
      ledgerEntryId: promotion.ledgerEntry.id,
      confidence: promotion.skill.trust.confidence,
      benchmarkScore: promotion.ledgerEntry.benchmarkScore,
    })),
    costUSD: result.costUSD,
    dryRun: result.dryRun,
  };
}

function formatDeterministicDemoSequence(
  sequence: DeterministicDemoSequenceResult,
): Record<string, unknown> {
  return {
    cycles: sequence.results.map(formatLearningCycleResult),
    snapshots: sequence.snapshots.map((snapshot) => ({
      stepId: snapshot.stepId,
      earnedSkills: snapshot.summary.earnedSkills.length,
      level: snapshot.summary.level,
      curve: snapshot.summary.curve,
      improvementPct: snapshot.summary.improvementPct,
    })),
    earnedSkills: sequence.summary.earnedSkills.length,
    level: sequence.summary.level,
    improvementPct: sequence.summary.improvementPct,
    curve: sequence.summary.curve,
  };
}

function formatDeterministicDemoHuman(sequence: DeterministicDemoSequenceResult): string {
  const promoted = sequence.results.flatMap((result) => result.promoted);

  if (promoted.length === 0) {
    return "Proof ran, but no demo skills were promoted.";
  }

  return [
    `Earned ${promoted.length} demo skill${promoted.length === 1 ? "" : "s"}.`,
    `Level: ${sequence.summary.level}`,
    `Improvement curve: ${sequence.summary.curve
      .map((point) => point.benchmarkScore.toFixed(2))
      .join(" -> ")}`,
    `Latest skill: ${promoted.at(-1)?.skill.name ?? "unknown"}`,
  ].join("\n");
}

function formatLearningCycleHuman(result: LearningCycleResult): string {
  if (result.promoted.length > 0) {
    const latest = result.promoted.at(-1);
    const proof = result.proofResults.find(
      (proofResult) => proofResult.proofRun.id === latest?.ledgerEntry.proofRunId,
    )?.proofRun;

    return [
      `Earned skill: ${latest?.skill.name ?? "unknown"}`,
      proof === undefined
        ? "Proof receipt unavailable"
        : `Proof ${proof.id}: delta ${formatSigned(proof.measurement.delta)}, verdict ${
            proof.verdict
          }, confidence ${latest?.skill.trust.confidence.toFixed(2) ?? "0.00"}`,
    ].join("\n");
  }

  if (result.proofResults.length > 0) {
    const failed = result.proofResults.filter(
      (proofResult) => proofResult.proofRun.verdict === "fail",
    );

    if (failed.length > 0) {
      return `No skill earned. ${failed.length} proof run(s) failed closed.`;
    }

    return "Proof ran, but promotion writes were disabled.";
  }

  return `Distilled ${result.candidates.length} candidate skill(s).`;
}

function formatSigned(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(3)}`;
}

async function writeEnvExample(options: { force: boolean }): Promise<void> {
  const path = resolve(".env.example");
  const contents = [
    "# Copy to .env and fill in the key locally. Do not commit .env.",
    "OPENAI_API_KEY=",
    "OPENAI_MODEL=gpt-5.5",
    "# OPENAI_BASE_URL=https://api.openai.com/v1",
    "",
  ].join("\n");

  if (options.force) {
    await writeFile(path, contents, "utf8");
    return;
  }

  try {
    await writeFile(path, contents, { encoding: "utf8", flag: "wx" });
  } catch (error) {
    if (isNodeError(error) && error.code === "EEXIST") {
      return;
    }

    throw error;
  }
}

function formatCliError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected error";
}

function exitCodeForError(error: unknown): number {
  if (error instanceof RatchetError) {
    switch (error.code) {
      case "PROVIDER_FAILED":
        return 8;
      case "VAULT_WRITE_FAILED":
        return 4;
      case "SCHEMA_VALIDATION_FAILED":
      case "DISTILLATION_FAILED":
      case "REDACTION_FAILED":
        return 3;
    }
  }

  return 1;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
