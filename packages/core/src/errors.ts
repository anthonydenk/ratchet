export type RatchetErrorCode =
  | "DISTILLATION_FAILED"
  | "PROOF_GATE_FAILED"
  | "PROMOTION_FAILED"
  | "PROVIDER_FAILED"
  | "REDACTION_FAILED"
  | "SCHEMA_VALIDATION_FAILED"
  | "VAULT_WRITE_FAILED";

export class RatchetError extends Error {
  readonly code: RatchetErrorCode;

  constructor(code: RatchetErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "RatchetError";
    this.code = code;
  }
}

export class DistillationError extends RatchetError {
  constructor(message: string, options?: ErrorOptions) {
    super("DISTILLATION_FAILED", message, options);
    this.name = "DistillationError";
  }
}

export class ProviderError extends RatchetError {
  constructor(message: string, options?: ErrorOptions) {
    super("PROVIDER_FAILED", message, options);
    this.name = "ProviderError";
  }
}

export class ProofGateError extends RatchetError {
  constructor(message: string, options?: ErrorOptions) {
    super("PROOF_GATE_FAILED", message, options);
    this.name = "ProofGateError";
  }
}

export class PromotionError extends RatchetError {
  constructor(message: string, options?: ErrorOptions) {
    super("PROMOTION_FAILED", message, options);
    this.name = "PromotionError";
  }
}

export class RedactionError extends RatchetError {
  constructor(message: string, options?: ErrorOptions) {
    super("REDACTION_FAILED", message, options);
    this.name = "RedactionError";
  }
}

export class SchemaValidationError extends RatchetError {
  constructor(message: string, options?: ErrorOptions) {
    super("SCHEMA_VALIDATION_FAILED", message, options);
    this.name = "SchemaValidationError";
  }
}

export class VaultWriteError extends RatchetError {
  constructor(message: string, options?: ErrorOptions) {
    super("VAULT_WRITE_FAILED", message, options);
    this.name = "VaultWriteError";
  }
}
