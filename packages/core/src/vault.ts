import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve, sep } from "node:path";
import type { Note } from "@ratchet/schema";
import { NoteSchema } from "@ratchet/schema";
import { parse, stringify } from "yaml";
import { VaultWriteError } from "./errors.js";
import { assertNoSensitiveText } from "./redaction.js";

const MANAGED_FRONTMATTER_KEYS = new Set([
  "ratchet",
  "id",
  "schemaVersion",
  "title",
  "kind",
  "sourceSessionId",
  "promotedToSkill",
  "createdAt",
  "vaultPath",
  "links",
]);

interface ExistingFrontmatter {
  data: Record<string, unknown>;
  endOffset: number;
}

interface ManagedRegion {
  beginStart: number;
  endEnd: number;
}

export interface WriteNoteOptions {
  vaultRoot: string;
}

export interface WriteNoteResult {
  note: Note;
  absolutePath: string;
  markdown: string;
}

export async function initializeVault(vaultRoot: string): Promise<void> {
  await mkdir(resolve(vaultRoot, "notes"), { recursive: true });
  await mkdir(resolve(vaultRoot, "skills"), { recursive: true });
  await mkdir(resolve(vaultRoot, ".ratchet", "cards"), { recursive: true });
  await mkdir(resolve(vaultRoot, ".ratchet", "ledger"), { recursive: true });
  await mkdir(resolve(vaultRoot, ".ratchet", "proofs"), { recursive: true });
  await mkdir(resolve(vaultRoot, ".ratchet", "skills"), { recursive: true });
  await mkdir(resolve(vaultRoot, ".ratchet", "candidates"), { recursive: true });
  await mkdir(resolve(vaultRoot, ".ratchet", "manifests"), { recursive: true });
}

export async function writeNoteToVault(
  inputNote: Note,
  options: WriteNoteOptions,
): Promise<WriteNoteResult> {
  const parsed = NoteSchema.safeParse(inputNote);

  if (!parsed.success) {
    throw new VaultWriteError("Refusing to write an invalid Note to the vault", {
      cause: parsed.error,
    });
  }

  await initializeVault(options.vaultRoot);

  const note = await resolveWritableNote(parsed.data, options.vaultRoot);
  const absolutePath = resolveVaultPath(options.vaultRoot, note.vaultPath);
  const markdown = await renderWriteContent(note, absolutePath);

  assertNoSensitiveText(markdown, "rendered note markdown");

  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, markdown, "utf8");

  return { note, absolutePath, markdown };
}

export function renderNoteMarkdown(note: Note): string {
  return `${renderNoteFrontmatter(note)}\n${renderManagedRegion(note)}\n\n<!-- Anything OUTSIDE the begin/end block is YOURS. Ratchet never edits below this line. -->\n`;
}

export function buildNoteVaultPath(createdAt: string, title: string): string {
  const date = createdAt.slice(0, 10);
  return `notes/${date}-${slugify(title)}.md`;
}

export function slugify(value: string): string {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

  return slug.length > 0 ? slug : "note";
}

async function resolveWritableNote(note: Note, vaultRoot: string): Promise<Note> {
  const originalVaultPath = note.vaultPath;

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidateVaultPath =
      attempt === 0 ? originalVaultPath : addCollisionSuffix(note, attempt);
    const candidateNote = NoteSchema.parse({ ...note, vaultPath: candidateVaultPath });
    const absolutePath = resolveVaultPath(vaultRoot, candidateNote.vaultPath);
    const existing = await readTextIfExists(absolutePath);

    if (existing === undefined || existingBelongsToNote(existing, candidateNote.id)) {
      return candidateNote;
    }
  }

  throw new VaultWriteError(`Could not find a collision-free note path for ${note.id}`);
}

async function renderWriteContent(note: Note, absolutePath: string): Promise<string> {
  const existing = await readTextIfExists(absolutePath);

  if (existing === undefined) {
    return renderNoteMarkdown(note);
  }

  return updateExistingNoteContent(existing, note);
}

function updateExistingNoteContent(existing: string, note: Note): string {
  const frontmatter = parseFrontmatter(existing);
  const region = parseManagedRegion(existing, note.id);
  const frontmatterBlock = renderNoteFrontmatter(note, frontmatter.data);
  const beforeRegion = existing.slice(frontmatter.endOffset, region.beginStart);
  const afterRegion = existing.slice(region.endEnd);

  return `${frontmatterBlock}${beforeRegion}${renderManagedRegion(note)}${afterRegion}`;
}

function renderNoteFrontmatter(note: Note, existingData: Record<string, unknown> = {}): string {
  const managedData = {
    ratchet: "note",
    id: note.id,
    schemaVersion: note.schemaVersion,
    title: note.title,
    kind: note.kind,
    sourceSessionId: note.sourceSessionId,
    ...(note.promotedToSkill === undefined ? {} : { promotedToSkill: note.promotedToSkill }),
    createdAt: note.createdAt,
    vaultPath: note.vaultPath,
    links: buildNoteLinks(note),
  };

  const preservedData = Object.fromEntries(
    Object.entries(existingData).filter(([key]) => !MANAGED_FRONTMATTER_KEYS.has(key)),
  );

  return `---\n${stringify({ ...preservedData, ...managedData }).trimEnd()}\n---\n`;
}

function renderManagedRegion(note: Note): string {
  return [
    `<!-- ratchet:begin id=${note.id} -->`,
    `## ${note.title}`,
    "",
    note.body,
    `<!-- ratchet:end id=${note.id} -->`,
  ].join("\n");
}

function buildNoteLinks(note: Note): string[] {
  const links = [`[[sessions/${wikilinkSlug(note.sourceSessionId)}]]`];

  if (note.promotedToSkill !== undefined) {
    links.push(`[[skills/${wikilinkSlug(note.promotedToSkill)}]]`);
  }

  return links;
}

function wikilinkSlug(value: string): string {
  return value.replace(/[\]|#^]/g, "-");
}

function addCollisionSuffix(note: Note, attempt: number): string {
  const suffix =
    attempt === 1
      ? note.id.toLowerCase().slice(0, 6)
      : `${note.id.toLowerCase().slice(0, 6)}-${attempt}`;
  const extension = ".md";
  const base = note.vaultPath.endsWith(extension)
    ? note.vaultPath.slice(0, -extension.length)
    : note.vaultPath;

  return `${base}-${suffix}${extension}`;
}

function existingBelongsToNote(markdown: string, noteId: string): boolean {
  if (!markdown.startsWith("---\n")) {
    return false;
  }

  const frontmatter = parseFrontmatter(markdown);

  return frontmatter.data.ratchet === "note" && frontmatter.data.id === noteId;
}

function parseFrontmatter(markdown: string): ExistingFrontmatter {
  if (!markdown.startsWith("---\n")) {
    throw new VaultWriteError(
      "Existing note is missing Ratchet front matter; refusing to overwrite",
    );
  }

  const closeIndex = markdown.indexOf("\n---", 4);

  if (closeIndex === -1) {
    throw new VaultWriteError("Existing note front matter is malformed; refusing to overwrite");
  }

  const rawYaml = markdown.slice(4, closeIndex);
  const data = parseYamlRecord(rawYaml);
  const endOffset = closeIndex + "\n---".length;

  if (markdown[endOffset] === "\n") {
    return { data, endOffset: endOffset + 1 };
  }

  return { data, endOffset };
}

function parseYamlRecord(rawYaml: string): Record<string, unknown> {
  const parsed = rawYaml.trim().length === 0 ? {} : parse(rawYaml);

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new VaultWriteError("Existing note front matter must be a YAML object");
  }

  return parsed as Record<string, unknown>;
}

function parseManagedRegion(markdown: string, noteId: string): ManagedRegion {
  const beginMarker = `<!-- ratchet:begin id=${noteId} -->`;
  const endMarker = `<!-- ratchet:end id=${noteId} -->`;
  const beginMatches = [...markdown.matchAll(new RegExp(escapeRegExp(beginMarker), "g"))];
  const endMatches = [...markdown.matchAll(new RegExp(escapeRegExp(endMarker), "g"))];

  if (beginMatches.length !== 1 || endMatches.length !== 1) {
    throw new VaultWriteError("Existing note has missing or duplicate managed-region markers");
  }

  const beginStart = beginMatches[0]?.index;
  const endStart = endMatches[0]?.index;

  if (beginStart === undefined || endStart === undefined || beginStart > endStart) {
    throw new VaultWriteError("Existing note managed-region markers are malformed");
  }

  return {
    beginStart,
    endEnd: endStart + endMarker.length,
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function resolveVaultPath(vaultRoot: string, vaultPath: string): string {
  if (isAbsolute(vaultPath) || vaultPath.split(/[\\/]/).includes("..")) {
    throw new VaultWriteError(`Unsafe vaultPath refused: ${vaultPath}`);
  }

  const root = resolve(vaultRoot);
  const resolved = resolve(root, vaultPath);

  if (resolved !== root && !resolved.startsWith(`${root}${sep}`)) {
    throw new VaultWriteError(`Unsafe vaultPath refused: ${vaultPath}`);
  }

  return resolved;
}

async function readTextIfExists(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return undefined;
    }

    throw error;
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
