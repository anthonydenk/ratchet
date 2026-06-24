import {
  assertMetaEvalReportWithinThresholds,
  evaluateProofGate,
  findMetaEvalMisclassifications,
  formatMetaEvalMisclassifications,
  formatMetaEvalReport,
  runGateOverCorpus,
  scoreMetaEvalResults,
} from "@ratchet/core";
import { describe, expect, it } from "vitest";
import { loadHoldoutCorpus } from "./corpus/holdout.js";
import { THRESHOLDS } from "./thresholds.js";

async function buildHoldoutReport() {
  const diverseResults = await runGateOverCorpus(loadHoldoutCorpus("diverse"));
  const colludingResults = await runGateOverCorpus(loadHoldoutCorpus("same-family"));
  const diverseFpr = falsePromoteRate(diverseResults);
  const colludingFpr = falsePromoteRate(colludingResults);
  const providerDiversityGap = colludingFpr - diverseFpr;
  const report = scoreMetaEvalResults(diverseResults, THRESHOLDS, providerDiversityGap);

  return { diverseResults, report };
}

describe("proof-gate meta-eval", () => {
  it("keeps false-promote and false-reject rates within THRESHOLDS.md", async () => {
    const { diverseResults, report } = await buildHoldoutReport();
    const failures = assertMetaEvalReportWithinThresholds(report, THRESHOLDS);
    const misclassifications = findMetaEvalMisclassifications(diverseResults);
    const detail = formatMetaEvalMisclassifications(misclassifications);

    process.stdout.write(
      `\n${formatMetaEvalReport(report, THRESHOLDS)}${detail.length > 0 ? `\n${detail}` : ""}\n\n`,
    );

    expect(failures, detail).toEqual([]);
  });

  it("enforces evaluator independence as a hard gate", async () => {
    const testCase = loadHoldoutCorpus("diverse")[0];

    if (testCase === undefined) {
      throw new Error("holdout corpus is empty");
    }

    await expect(
      evaluateProofGate(testCase.candidate, {
        ...testCase.context,
        verifier: {
          ...testCase.context.verifier,
          configHash: testCase.candidate.provenance.proposerConfigHash,
        },
      }),
    ).rejects.toThrow(/Evaluator independence violated/i);
  });

  it("rejects a candidate when the regression suite cannot run", async () => {
    const testCase = loadHoldoutCorpus("diverse").find(
      (candidateCase) => candidateCase.expectRegressionFailClosed === true,
    );

    if (testCase === undefined) {
      throw new Error("holdout corpus is missing regression fail-closed coverage");
    }

    const proofRun = await evaluateProofGate(testCase.candidate, testCase.context);

    expect(proofRun.verdict).toBe("fail");
    expect(proofRun.dissent).toMatch(/regression suite could not run/i);
  });
});

function falsePromoteRate(results: Awaited<ReturnType<typeof runGateOverCorpus>>): number {
  const badCases = results.filter((result) => result.label === "bad");
  const falsePromotes = badCases.filter((result) => result.promoted).length;

  if (badCases.length === 0) {
    return 0;
  }

  return falsePromotes / badCases.length;
}
