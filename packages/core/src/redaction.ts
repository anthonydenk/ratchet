import { RedactionError } from "./errors.js";

export const REDACTION_PLACEHOLDER = "[redacted]";

const redactionPatterns = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  /\bsk-[A-Za-z0-9_-]{20,}\b/g,
  /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}\b/gi,
  /\b(?:api[_-]?key|secret|token|password)\s*[:=]\s*["']?[A-Za-z0-9_\-./+=]{8,}["']?/gi,
] as const;

const detectionPatterns = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\bsk-[A-Za-z0-9_-]{20,}\b/,
  /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}\b/i,
  /\b(?:api[_-]?key|secret|token|password)\s*[:=]\s*["']?[A-Za-z0-9_\-./+=]{8,}["']?/i,
] as const;

export interface RedactionResult {
  text: string;
  redactions: number;
}

export function redactSensitiveText(input: string): RedactionResult {
  let text = input;
  let redactions = 0;

  for (const pattern of redactionPatterns) {
    text = text.replace(pattern, () => {
      redactions += 1;
      return REDACTION_PLACEHOLDER;
    });
  }

  return { text, redactions };
}

export function containsSensitiveText(input: string): boolean {
  return detectionPatterns.some((pattern) => pattern.test(input));
}

export function assertNoSensitiveText(input: string, label: string): void {
  if (containsSensitiveText(input)) {
    throw new RedactionError(`${label} still contains detected secrets or PII after redaction`);
  }
}
