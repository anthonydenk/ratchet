import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createDeterministicDemoProofEvaluator,
  DETERMINISTIC_DEMO_PROOF_CONFIG,
  DETERMINISTIC_DEMO_PROVIDERS,
  DETERMINISTIC_DEMO_STEPS,
  DeterministicDemoProvider,
  runDeterministicDemoSequence,
} from "./deterministic-demo.js";
import { readEarnedSkills, renderLedger, summarizeLedger, writeLedgerCard } from "./ledger.js";
import { runLearningCycle } from "./pipeline.js";

describe("runLearningCycle", () => {
  it("runs the deterministic demo sequence from transcript to three earned skills and a moving card", async () => {
    const vaultRoot = await makeTempVault();

    try {
      const sequence = await runDeterministicDemoSequence({ vaultRoot });

      expect(sequence.results).toHaveLength(3);
      expect(sequence.results.flatMap((result) => result.promoted)).toHaveLength(3);
      expect(sequence.snapshots.map((snapshot) => snapshot.summary.level)).toEqual([1, 2, 3]);
      expect(sequence.snapshots.map((snapshot) => snapshot.summary.earnedSkills.length)).toEqual([
        1, 2, 3,
      ]);
      expect(sequence.snapshots.at(0)?.summary.curve.map((point) => point.benchmarkScore)).toEqual([
        0.4,
      ]);
      expect(sequence.snapshots.at(1)?.summary.curve.map((point) => point.benchmarkScore)).toEqual([
        0.4, 0.7,
      ]);
      expect(sequence.summary.curve.map((point) => point.benchmarkScore)).toEqual([0.4, 0.7, 1]);
      expect(sequence.summary.improvementPct).toBeCloseTo(150);
      expect(sequence.summary.level).toBe(3);

      const earned = await readEarnedSkills(vaultRoot);
      expect(earned).toHaveLength(3);
      expect(earned.map((skill) => skill.skill.name)).toEqual([
        "Run database migrations before tests",
        "Quote bracketed shell paths",
        "Use rg for repo search first",
      ]);
      expect(earned.map((skill) => skill.entry.cumulativeSkills)).toEqual([1, 2, 3]);
      expect(earned.map((skill) => skill.entry.benchmarkScore)).toEqual([0.4, 0.7, 1]);
      expect(earned.every((skill) => skill.proofRun.verdict === "pass")).toBe(true);
      expect(earned.every((skill) => skill.proofRun.regression.regressions.length === 0)).toBe(
        true,
      );

      const summary = await summarizeLedger(vaultRoot);
      expect(renderLedger(summary)).toContain("Earned skills: 3");
      expect(renderLedger(summary)).toContain("delta=+0.330");

      const card = await writeLedgerCard({
        vaultRoot,
        outPath: join(vaultRoot, "card.svg"),
      });
      const cardFile = await readFile(card.path, "utf8");

      expect(cardFile).toContain("LEVEL 3");
      expect(cardFile).toContain("3 skills earned");
      expect(cardFile).toContain("Improvement +150.0% on yardstick baseline");
      expect(cardFile).toContain("Use rg for repo search first");
      expect(cardFile).toContain("demo-proof-ripgrep-first");
      expect(cardFile).not.toContain("column users.role");
    } finally {
      await rm(vaultRoot, { force: true, recursive: true });
    }
  });

  it("renders a one-skill card without a fake 0.0% improvement claim", async () => {
    const vaultRoot = await makeTempVault();
    const provider = new DeterministicDemoProvider();
    const step = DETERMINISTIC_DEMO_STEPS[0];

    try {
      await runLearningCycle(
        {
          sourceSessionId: step.sourceSessionId,
          transcript: step.transcript,
        },
        {
          vaultRoot,
          noteProvider: provider,
          skillProvider: provider,
          proofEvaluator: createDeterministicDemoProofEvaluator(),
          proposer: DETERMINISTIC_DEMO_PROVIDERS.proposer,
          verifier: DETERMINISTIC_DEMO_PROVIDERS.verifier,
          baseline: DETERMINISTIC_DEMO_PROVIDERS.baseline,
          proofConfig: DETERMINISTIC_DEMO_PROOF_CONFIG,
          idFactory: deterministicDemoIdFactory,
          now: () => step.now,
          benchmarkScore: () => step.yardstickScore,
        },
      );

      const card = await writeLedgerCard({
        vaultRoot,
        outPath: join(vaultRoot, "one-skill-card.svg"),
      });
      const cardFile = await readFile(card.path, "utf8");

      expect(card.summary.level).toBe(1);
      expect(cardFile).toContain("1 skill earned");
      expect(cardFile).toContain("Yardstick baseline established");
      expect(cardFile).not.toContain("skills earned");
      expect(cardFile).not.toContain("Improvement 0.0%");
      expect(cardFile).not.toContain("+0.0%");
    } finally {
      await rm(vaultRoot, { force: true, recursive: true });
    }
  });
});

async function makeTempVault(): Promise<string> {
  return mkdtemp(join(tmpdir(), "ratchet-pipeline-"));
}

function deterministicDemoIdFactory(label: string): string {
  const ids: Record<string, string> = {
    note: "demo-note-db-migration",
    "skill-0": "demo-skill-db-migration",
    "proof-demo-skill-db-migration": "demo-proof-db-migration",
    "ledger-demo-skill-db-migration": "demo-ledger-db-migration",
  };

  return ids[label] ?? `demo-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}
