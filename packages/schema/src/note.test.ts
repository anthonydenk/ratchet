import { describe, expect, it } from "vitest";
import { NoteSchema } from "./note.js";
import { CURRENT_SCHEMA_VERSION } from "./shared.js";

const validNote = {
  id: "01K0RATCHETNOTE000000000001",
  schemaVersion: CURRENT_SCHEMA_VERSION,
  title: "Prefer pnpm for workspace commands",
  body: "Use `pnpm` for install, build, test, and workspace filtering.",
  sourceSessionId: "session-2026-06-22-001",
  kind: "preference",
  createdAt: "2026-06-22T12:00:00.000Z",
  vaultPath: "notes/2026-06-22-prefer-pnpm-for-workspace-commands.md",
};

describe("NoteSchema", () => {
  it("accepts the documented Note fields", () => {
    expect(NoteSchema.parse(validNote)).toEqual(validNote);
  });

  it("rejects unknown fields instead of silently dropping them", () => {
    const result = NoteSchema.safeParse({
      ...validNote,
      tags: ["workspace"],
    });

    expect(result.success).toBe(false);
  });

  it("rejects detected sensitive content in note content", () => {
    const result = NoteSchema.safeParse({
      ...validNote,
      body: "The note should not persist person@example.com.",
    });

    expect(result.success).toBe(false);
  });
});
