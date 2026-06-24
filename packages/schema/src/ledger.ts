import { z } from "zod";
import { IdentifierSchema, IsoDateTimeSchema, SchemaVersionSchema } from "./shared.js";

export const LedgerEventSchema = z.enum(["promoted", "retired", "quarantined", "revalidated"]);

export const LedgerEntrySchema = z
  .object({
    id: IdentifierSchema,
    schemaVersion: SchemaVersionSchema,
    event: LedgerEventSchema,
    skillId: IdentifierSchema,
    proofRunId: IdentifierSchema.optional(),
    at: IsoDateTimeSchema,
    cumulativeSkills: z.number().int().nonnegative(),
    benchmarkScore: z.number().optional(),
  })
  .strict()
  .superRefine((entry, context) => {
    if (
      (entry.event === "promoted" || entry.event === "revalidated") &&
      entry.proofRunId === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["proofRunId"],
        message: "promoted and revalidated ledger entries require a proofRunId",
      });
    }
  });

export type LedgerEvent = z.infer<typeof LedgerEventSchema>;
export type LedgerEntry = z.infer<typeof LedgerEntrySchema>;
