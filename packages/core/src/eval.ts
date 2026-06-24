import type { ProofRun, Skill } from "@ratchet/schema";
import { type EvaluateProofGateContext, evaluateProofGate } from "./proof-gate.js";

export type MetaEvalLabel = "good" | "bad";

export interface MetaEvalCase {
  id: string;
  label: MetaEvalLabel;
  candidate: Skill;
  context: EvaluateProofGateContext;
  failureMode?: string;
  rationale: string;
  expectRegressionFailClosed?: boolean;
}

export interface MetaEvalCaseResult {
  caseId: string;
  label: MetaEvalLabel;
  candidate: Skill;
  promoted: boolean;
  proofRun?: ProofRun;
  failureMode?: string;
  expectRegressionFailClosed: boolean;
  error?: unknown;
}

export interface MetaEvalThresholds {
  maxFalsePromoteRate: number;
  maxFalseRejectRate: number;
  minCases: number;
  minTrialsPerCase: number;
  fprConfidence: number;
  minProviderDiversityGap: number;
}

export interface MetaEvalReport {
  cases: number;
  goodCases: number;
  badCases: number;
  trialsPerCase: number;
  falsePromotes: number;
  falseRejects: number;
  falsePromoteRate: number;
  falseRejectRate: number;
  fprUpperConfidence: number;
  providerDiversityGap: number;
  independenceViolations: number;
  regressionFailClosedLeaks: number;
  manifestCompletenessFailures: number;
}

export interface MetaEvalMisclassifications {
  falsePromotes: MetaEvalCaseResult[];
  falseRejects: MetaEvalCaseResult[];
}

export async function runGateOverCorpus(cases: MetaEvalCase[]): Promise<MetaEvalCaseResult[]> {
  const results: MetaEvalCaseResult[] = [];

  for (const testCase of cases) {
    try {
      const proofRun = await evaluateProofGate(testCase.candidate, testCase.context);

      results.push({
        caseId: testCase.id,
        label: testCase.label,
        candidate: testCase.candidate,
        promoted: proofRun.verdict === "pass",
        proofRun,
        expectRegressionFailClosed: testCase.expectRegressionFailClosed ?? false,
        ...(testCase.failureMode === undefined ? {} : { failureMode: testCase.failureMode }),
      });
    } catch (error) {
      results.push({
        caseId: testCase.id,
        label: testCase.label,
        candidate: testCase.candidate,
        promoted: false,
        expectRegressionFailClosed: testCase.expectRegressionFailClosed ?? false,
        error,
        ...(testCase.failureMode === undefined ? {} : { failureMode: testCase.failureMode }),
      });
    }
  }

  return results;
}

export function findMetaEvalMisclassifications(
  results: MetaEvalCaseResult[],
): MetaEvalMisclassifications {
  return {
    falsePromotes: results.filter((result) => result.label === "bad" && result.promoted),
    falseRejects: results.filter((result) => result.label === "good" && !result.promoted),
  };
}

export function scoreMetaEvalResults(
  results: MetaEvalCaseResult[],
  thresholds: MetaEvalThresholds,
  providerDiversityGap: number,
): MetaEvalReport {
  const goodCases = results.filter((result) => result.label === "good");
  const badCases = results.filter((result) => result.label === "bad");
  const falsePromotes = badCases.filter((result) => result.promoted).length;
  const falseRejects = goodCases.filter((result) => !result.promoted).length;
  const independenceViolations = results.filter((result) => {
    if (result.proofRun === undefined) {
      return false;
    }

    return (
      result.proofRun.manifest.verifierConfigHash === result.candidate.provenance.proposerConfigHash
    );
  }).length;
  const regressionFailClosedLeaks = results.filter(
    (result) => result.expectRegressionFailClosed && result.promoted,
  ).length;
  const manifestCompletenessFailures = results.filter(
    (result) => result.error === undefined && result.proofRun === undefined,
  ).length;

  return {
    cases: results.length,
    goodCases: goodCases.length,
    badCases: badCases.length,
    trialsPerCase: thresholds.minTrialsPerCase,
    falsePromotes,
    falseRejects,
    falsePromoteRate: rate(falsePromotes, badCases.length),
    falseRejectRate: rate(falseRejects, goodCases.length),
    fprUpperConfidence: upperBinomialConfidence(
      falsePromotes,
      badCases.length,
      thresholds.fprConfidence,
    ),
    providerDiversityGap,
    independenceViolations,
    regressionFailClosedLeaks,
    manifestCompletenessFailures,
  };
}

export function formatMetaEvalMisclassifications(
  misclassifications: MetaEvalMisclassifications,
): string {
  const lines: string[] = [];

  if (misclassifications.falsePromotes.length > 0) {
    lines.push("false-promoted bad cases:");
    lines.push(...misclassifications.falsePromotes.map(formatCaseResult));
  }

  if (misclassifications.falseRejects.length > 0) {
    lines.push("false-rejected good cases:");
    lines.push(...misclassifications.falseRejects.map(formatCaseResult));
  }

  return lines.join("\n");
}

export function assertMetaEvalReportWithinThresholds(
  report: MetaEvalReport,
  thresholds: MetaEvalThresholds,
): string[] {
  const failures: string[] = [];

  if (report.cases < thresholds.minCases) {
    failures.push(`cases ${report.cases} < minCases ${thresholds.minCases}`);
  }

  if (report.trialsPerCase < thresholds.minTrialsPerCase) {
    failures.push(
      `trials/case ${report.trialsPerCase} < minTrialsPerCase ${thresholds.minTrialsPerCase}`,
    );
  }

  if (report.falsePromoteRate > thresholds.maxFalsePromoteRate) {
    failures.push(
      `false-promote rate ${report.falsePromoteRate.toFixed(3)} > ${thresholds.maxFalsePromoteRate}`,
    );
  }

  if (report.fprUpperConfidence > thresholds.maxFalsePromoteRate) {
    failures.push(
      `FPR upper CI ${report.fprUpperConfidence.toFixed(3)} > ${thresholds.maxFalsePromoteRate}`,
    );
  }

  if (report.falseRejectRate > thresholds.maxFalseRejectRate) {
    failures.push(
      `false-reject rate ${report.falseRejectRate.toFixed(3)} > ${thresholds.maxFalseRejectRate}`,
    );
  }

  if (report.providerDiversityGap <= thresholds.minProviderDiversityGap) {
    failures.push(
      `provider diversity gap ${report.providerDiversityGap.toFixed(3)} <= ${thresholds.minProviderDiversityGap}`,
    );
  }

  if (report.independenceViolations > 0) {
    failures.push(`independence violations ${report.independenceViolations} > 0`);
  }

  if (report.regressionFailClosedLeaks > 0) {
    failures.push(`regression fail-closed leaks ${report.regressionFailClosedLeaks} > 0`);
  }

  if (report.manifestCompletenessFailures > 0) {
    failures.push(`manifest completeness failures ${report.manifestCompletenessFailures} > 0`);
  }

  return failures;
}

export function formatMetaEvalReport(
  report: MetaEvalReport,
  thresholds: MetaEvalThresholds,
): string {
  const passMark = (passed: boolean) => (passed ? "PASS" : "FAIL");

  return [
    "meta-eval (holdout) - deterministic fake provider",
    `  cases scored ............ ${report.cases} (${passMark(report.cases >= thresholds.minCases)} >= ${thresholds.minCases})`,
    `  trials/case ............. ${report.trialsPerCase} (${passMark(report.trialsPerCase >= thresholds.minTrialsPerCase)} >= ${thresholds.minTrialsPerCase})`,
    `  false-promote rate ...... ${report.falsePromoteRate.toFixed(3)} (CI${Math.round(
      thresholds.fprConfidence * 100,
    )} <= ${report.fprUpperConfidence.toFixed(3)}) (${passMark(
      report.fprUpperConfidence <= thresholds.maxFalsePromoteRate,
    )} <= ${thresholds.maxFalsePromoteRate})`,
    `  false-reject rate ....... ${report.falseRejectRate.toFixed(3)} (${passMark(
      report.falseRejectRate <= thresholds.maxFalseRejectRate,
    )} <= ${thresholds.maxFalseRejectRate})`,
    `  diversity FPR gap ....... +${report.providerDiversityGap.toFixed(3)} (${passMark(
      report.providerDiversityGap > thresholds.minProviderDiversityGap,
    )} > ${thresholds.minProviderDiversityGap})`,
    `  independence violations . ${report.independenceViolations} (${passMark(
      report.independenceViolations === 0,
    )})`,
    `  regression fail-closed .. ${report.regressionFailClosedLeaks} leaks (${passMark(
      report.regressionFailClosedLeaks === 0,
    )})`,
    `  manifest failures ....... ${report.manifestCompletenessFailures} (${passMark(
      report.manifestCompletenessFailures === 0,
    )})`,
  ].join("\n");
}

function rate(count: number, total: number): number {
  if (total === 0) {
    return 0;
  }

  return count / total;
}

function upperBinomialConfidence(successes: number, trials: number, confidence: number): number {
  if (trials === 0) {
    return 1;
  }

  if (successes === 0) {
    return 1 - (1 - confidence) ** (1 / trials);
  }

  const z = confidence >= 0.95 ? 1.96 : 1.64;
  const p = successes / trials;
  const denominator = 1 + z ** 2 / trials;
  const center = p + z ** 2 / (2 * trials);
  const margin = z * Math.sqrt((p * (1 - p) + z ** 2 / (4 * trials)) / trials);

  return Math.min(1, (center + margin) / denominator);
}

function formatCaseResult(result: MetaEvalCaseResult): string {
  const proof = result.proofRun;

  if (proof === undefined) {
    return `  - ${result.caseId} (${result.failureMode ?? "unknown"}): threw ${formatError(
      result.error,
    )}`;
  }

  return [
    `  - ${result.caseId} (${result.failureMode ?? "unknown"})`,
    `verdict=${proof.verdict}`,
    `delta=${proof.measurement.delta.toFixed(3)}`,
    `trials=${proof.measurement.trials}`,
    `dissent=${proof.dissent ?? "none"}`,
  ].join(" | ");
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
