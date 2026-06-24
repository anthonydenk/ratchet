export {
  createDeterministicDemoProofEvaluator,
  DETERMINISTIC_DEMO_PROOF_CONFIG,
  DETERMINISTIC_DEMO_PROVIDERS,
  DETERMINISTIC_DEMO_STEPS,
  DETERMINISTIC_DEMO_TRANSCRIPT,
  DeterministicDemoProvider,
  type DeterministicDemoSequenceResult,
  type DeterministicDemoSnapshot,
  type DeterministicDemoStep,
  runDeterministicDemoSequence,
} from "./deterministic-demo.js";
export { type DistillInput, type DistillOptions, distill } from "./distill.js";
export {
  type CandidateSkillWithProofTasks,
  type DistillSkillInput,
  type DistillSkillOptions,
  distillSkillCandidates,
} from "./distill-skills.js";
export {
  DistillationError,
  PromotionError,
  ProofGateError,
  ProviderError,
  RatchetError,
  type RatchetErrorCode,
  RedactionError,
  SchemaValidationError,
  VaultWriteError,
} from "./errors.js";
export {
  assertMetaEvalReportWithinThresholds,
  findMetaEvalMisclassifications,
  formatMetaEvalMisclassifications,
  formatMetaEvalReport,
  type MetaEvalCase,
  type MetaEvalCaseResult,
  type MetaEvalLabel,
  type MetaEvalMisclassifications,
  type MetaEvalReport,
  type MetaEvalThresholds,
  runGateOverCorpus,
  scoreMetaEvalResults,
} from "./eval.js";
export {
  appendLedgerEntryToVault,
  type LedgerCurvePoint,
  type LedgerSummary,
  readEarnedSkills,
  readLedgerEntries,
  readProofRunFromVault,
  readSkillFromVault,
  renderLedger,
  renderLedgerCardMarkdown,
  renderLedgerCardSvg,
  type StoredEarnedSkill,
  summarizeLedger,
  type WriteCardOptions,
  type WriteCardResult,
  writeCandidateSkillToVault,
  writeLedgerCard,
  writePromotedSkillToVault,
  writeProofRunToVault,
} from "./ledger.js";
export { OpenAIModelProvider, type OpenAIModelProviderOptions } from "./openai-provider.js";
export {
  type BenchmarkScoreInput,
  type LearningCycleInput,
  type LearningCycleOptions,
  type LearningCyclePromotion,
  type LearningCycleProofResult,
  type LearningCycleResult,
  runLearningCycle,
} from "./pipeline.js";
export { type PromoteSkillOptions, type PromoteSkillResult, promoteSkill } from "./promotion.js";
export {
  createMemoryProofRunRecorder,
  type EvaluateProofGateContext,
  evaluateProofGate,
  type HeldOutTask,
  type ProofGateConfig,
  type ProofProviderConfig,
  type ProofRunRecorder,
  type ProofTrialEvaluator,
  type ProofTrialRequest,
  type ProofTrialResult,
  type RegressionCheck,
  type RegressionSuite,
  type TaskSource,
} from "./proof-gate.js";
export type { CompletionRequest, CompletionResult, ModelProvider } from "./provider.js";
export {
  assertNoSensitiveText,
  containsSensitiveText,
  REDACTION_PLACEHOLDER,
  type RedactionResult,
  redactSensitiveText,
} from "./redaction.js";
export {
  buildNoteVaultPath,
  initializeVault,
  renderNoteMarkdown,
  slugify,
  type WriteNoteOptions,
  type WriteNoteResult,
  writeNoteToVault,
} from "./vault.js";
