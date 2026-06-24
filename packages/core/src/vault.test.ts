import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CURRENT_SCHEMA_VERSION, NoteSchema } from "@ratchet/schema";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { distill } from "./distill.js";
import { VaultWriteError } from "./errors.js";
import type { ModelProvider } from "./provider.js";
import { writeNoteToVault } from "./vault.js";

const fixtureUrl = new URL("../test/fixtures/sessions/db-migration-gotcha.json", import.meta.url);

interface SessionFixture {
  id: string;
  transcript: string;
}

const provider: ModelProvider = {
  id: "fake-distiller",
  async complete() {
    return {
      output: {
        title: "Run database migrations before tests",
        body: [
          "The integration suite assumes the local database schema has been migrated.",
          "",
          "**Lesson:** run `pnpm db:migrate` before `pnpm test` when schema errors appear.",
        ].join("\n"),
        kind: "gotcha",
      },
    };
  },
};

describe("writeNoteToVault", () => {
  it("writes a schema-valid Note as markdown front matter plus a managed region", async () => {
    const vaultRoot = await makeTempVault();
    const session = await loadSessionFixture();

    try {
      const note = await distill(
        {
          sourceSessionId: session.id,
          transcript: session.transcript,
        },
        {
          provider,
          idFactory: () => "01K0RATCHETNOTE000000000001",
          now: () => new Date("2026-06-22T16:00:00.000Z"),
        },
      );

      const written = await writeNoteToVault(note, { vaultRoot });
      const markdown = await readFile(written.absolutePath, "utf8");
      const frontmatter = readFrontmatter(markdown);

      expect(NoteSchema.parse(written.note)).toEqual(written.note);
      expect(written.note.vaultPath).toBe(
        "notes/2026-06-22-run-database-migrations-before-tests.md",
      );
      expect(frontmatter).toMatchObject({
        ratchet: "note",
        id: "01K0RATCHETNOTE000000000001",
        schemaVersion: CURRENT_SCHEMA_VERSION,
        title: "Run database migrations before tests",
        kind: "gotcha",
        sourceSessionId: "fixture-db-migration-gotcha",
        createdAt: "2026-06-22T16:00:00.000Z",
        vaultPath: "notes/2026-06-22-run-database-migrations-before-tests.md",
        links: ["[[sessions/fixture-db-migration-gotcha]]"],
      });
      expect(markdown).toContain("<!-- ratchet:begin id=01K0RATCHETNOTE000000000001 -->");
      expect(markdown).toContain("## Run database migrations before tests");
      expect(markdown).toContain("<!-- ratchet:end id=01K0RATCHETNOTE000000000001 -->");
      expect(markdown).not.toContain("sk-live-FAKE000000000000000000000000");
      expect(markdown).not.toContain("api_key=");
    } finally {
      await rm(vaultRoot, { force: true, recursive: true });
    }
  });

  it("preserves user content outside the managed region on rewrite", async () => {
    const vaultRoot = await makeTempVault();

    try {
      const note = NoteSchema.parse({
        id: "01K0RATCHETNOTE000000000002",
        schemaVersion: CURRENT_SCHEMA_VERSION,
        title: "Preserve user text",
        body: "Original managed content.",
        sourceSessionId: "fixture-preserve",
        kind: "summary",
        createdAt: "2026-06-22T16:00:00.000Z",
        vaultPath: "notes/2026-06-22-preserve-user-text.md",
      });

      const firstWrite = await writeNoteToVault(note, { vaultRoot });
      await writeFile(
        firstWrite.absolutePath,
        `${firstWrite.markdown}\nUser annotation.\n`,
        "utf8",
      );

      const rewritten = await writeNoteToVault(
        {
          ...note,
          body: "Updated managed content.",
        },
        { vaultRoot },
      );

      const markdown = await readFile(rewritten.absolutePath, "utf8");

      expect(markdown).toContain("Updated managed content.");
      expect(markdown).toContain("User annotation.");
    } finally {
      await rm(vaultRoot, { force: true, recursive: true });
    }
  });

  it("fails closed when an existing managed region is malformed", async () => {
    const vaultRoot = await makeTempVault();

    try {
      const note = NoteSchema.parse({
        id: "01K0RATCHETNOTE000000000003",
        schemaVersion: CURRENT_SCHEMA_VERSION,
        title: "Malformed marker check",
        body: "Managed content.",
        sourceSessionId: "fixture-malformed",
        kind: "summary",
        createdAt: "2026-06-22T16:00:00.000Z",
        vaultPath: "notes/2026-06-22-malformed-marker-check.md",
      });

      const firstWrite = await writeNoteToVault(note, { vaultRoot });
      await writeFile(
        firstWrite.absolutePath,
        firstWrite.markdown.replace("<!-- ratchet:end id=01K0RATCHETNOTE000000000003 -->", ""),
        "utf8",
      );

      await expect(writeNoteToVault(note, { vaultRoot })).rejects.toBeInstanceOf(VaultWriteError);
    } finally {
      await rm(vaultRoot, { force: true, recursive: true });
    }
  });
});

async function makeTempVault(): Promise<string> {
  return mkdtemp(join(tmpdir(), "ratchet-vault-"));
}

async function loadSessionFixture(): Promise<SessionFixture> {
  const raw = JSON.parse(await readFile(fixtureUrl, "utf8")) as unknown;

  if (
    typeof raw === "object" &&
    raw !== null &&
    "id" in raw &&
    typeof raw.id === "string" &&
    "transcript" in raw &&
    typeof raw.transcript === "string"
  ) {
    return {
      id: raw.id,
      transcript: raw.transcript,
    };
  }

  throw new Error("Session fixture shape is invalid");
}

function readFrontmatter(markdown: string): Record<string, unknown> {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(markdown);

  if (match?.[1] === undefined) {
    throw new Error("Markdown note is missing front matter");
  }

  const parsed = parse(match[1]) as unknown;

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Markdown front matter is not an object");
  }

  return parsed as Record<string, unknown>;
}
