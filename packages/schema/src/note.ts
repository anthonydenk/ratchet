import { z } from "zod";
import {
  IdentifierSchema,
  IsoDateTimeSchema,
  SanitizedTextSchema,
  SchemaVersionSchema,
} from "./shared.js";

export const NoteKindSchema = z.enum(["summary", "decision", "gotcha", "preference"]);

export const NoteSchema = z
  .object({
    id: IdentifierSchema,
    schemaVersion: SchemaVersionSchema,
    title: SanitizedTextSchema,
    body: SanitizedTextSchema,
    sourceSessionId: IdentifierSchema,
    kind: NoteKindSchema,
    promotedToSkill: IdentifierSchema.optional(),
    createdAt: IsoDateTimeSchema,
    vaultPath: z.string().min(1),
  })
  .strict();

export type NoteKind = z.infer<typeof NoteKindSchema>;
export type Note = z.infer<typeof NoteSchema>;
