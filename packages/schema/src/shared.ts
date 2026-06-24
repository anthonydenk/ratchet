import { z } from "zod";

export const CURRENT_SCHEMA_VERSION = "0.2.0";

export const IdentifierSchema = z.string().min(1);

export const SchemaVersionSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+$/, "schemaVersion must be semver");

export const IsoDateTimeSchema = z.string().datetime({ offset: true });

const forbiddenSensitivePatterns = [
  {
    name: "email address",
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  },
  {
    name: "OpenAI-style API key",
    pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/,
  },
  {
    name: "GitHub token",
    pattern: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/,
  },
  {
    name: "bearer token",
    pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}\b/i,
  },
  {
    name: "credential assignment",
    pattern: /\b(?:api[_-]?key|secret|token|password)\s*[:=]\s*["']?[A-Za-z0-9_\-./+=]{8,}["']?/i,
  },
] as const;

export const SanitizedTextSchema = z
  .string()
  .min(1)
  .superRefine((value, context) => {
    for (const { name, pattern } of forbiddenSensitivePatterns) {
      if (pattern.test(value)) {
        context.addIssue({
          code: "custom",
          message: `detected ${name}; redact before validation`,
        });
      }
    }
  });

export const StringListSchema = z.array(z.string().min(1));
