import { CURRENT_SCHEMA_VERSION } from "@ratchet/schema";
import { describe, expect, it } from "vitest";
import { distill } from "./distill.js";
import { SchemaValidationError } from "./errors.js";
import type { CompletionRequest, ModelProvider } from "./provider.js";

const fixedDate = new Date("2026-06-22T15:00:00.000Z");

function createMockProvider(output: unknown, onRequest?: (request: CompletionRequest) => void) {
  const provider: ModelProvider = {
    id: "mock-provider",
    async complete(request) {
      onRequest?.(request);
      return { output };
    },
  };

  return provider;
}

describe("distill", () => {
  it("turns a session transcript into a validated Note with a mocked provider", async () => {
    const note = await distill(
      {
        sourceSessionId: "session-001",
        transcript: "The user decided to use pnpm for all monorepo commands.",
      },
      {
        provider: createMockProvider({
          title: "Prefer pnpm in the Ratchet workspace",
          body: "Use `pnpm` for installs, builds, tests, and workspace filtering.",
          kind: "preference",
        }),
        idFactory: () => "note-001",
        now: () => fixedDate,
      },
    );

    expect(note).toEqual({
      id: "note-001",
      schemaVersion: CURRENT_SCHEMA_VERSION,
      title: "Prefer pnpm in the Ratchet workspace",
      body: "Use `pnpm` for installs, builds, tests, and workspace filtering.",
      sourceSessionId: "session-001",
      kind: "preference",
      createdAt: "2026-06-22T15:00:00.000Z",
      vaultPath: "notes/2026-06-22-prefer-pnpm-in-the-ratchet-workspace.md",
    });
  });

  it("redacts the transcript before sending it to the provider", async () => {
    let capturedRequest: CompletionRequest | undefined;
    const fakeKey = ["sk", "123456789012345678901234567890"].join("-");

    await distill(
      {
        sourceSessionId: "session-002",
        transcript: `The failure was caused by an accidentally pasted key: ${fakeKey}.`,
      },
      {
        provider: createMockProvider(
          {
            title: "Configuration key caused a failure",
            body: "Keep credentials out of captured notes.",
            kind: "gotcha",
          },
          (request) => {
            capturedRequest = request;
          },
        ),
        idFactory: () => "note-002",
        now: () => fixedDate,
      },
    );

    expect(capturedRequest?.input).toContain("[redacted]");
    expect(capturedRequest?.input).not.toContain(fakeKey);
  });

  it("redacts sensitive content returned by the provider before Note validation", async () => {
    const note = await distill(
      {
        sourceSessionId: "session-003",
        transcript: "A session contained a support contact and the note should not keep it.",
      },
      {
        provider: createMockProvider({
          title: "Support escalation path",
          body: "Do not persist the customer email person@example.com in a note.",
          kind: "decision",
        }),
        idFactory: () => "note-003",
        now: () => fixedDate,
      },
    );

    expect(note.body).toContain("[redacted]");
    expect(note.body).not.toContain("person@example.com");
  });

  it("fails closed when the provider output is not a Note candidate", async () => {
    await expect(
      distill(
        {
          sourceSessionId: "session-004",
          transcript: "This transcript is valid but the mocked model is not.",
        },
        {
          provider: createMockProvider({
            title: "Missing kind and body",
          }),
          idFactory: () => "note-004",
          now: () => fixedDate,
        },
      ),
    ).rejects.toBeInstanceOf(SchemaValidationError);
  });
});
