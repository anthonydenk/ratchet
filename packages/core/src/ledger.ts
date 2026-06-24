import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import {
  type LedgerEntry,
  LedgerEntrySchema,
  type ProofRun,
  ProofRunSchema,
  type Skill,
  SkillSchema,
} from "@ratchet/schema";
import { VaultWriteError } from "./errors.js";
import { assertNoSensitiveText } from "./redaction.js";
import { initializeVault, slugify } from "./vault.js";

export interface StoredEarnedSkill {
  entry: LedgerEntry;
  skill: Skill;
  proofRun: ProofRun;
}

export interface LedgerCurvePoint {
  sequence: number;
  at: string;
  cumulativeSkills: number;
  benchmarkScore: number;
}

export interface LedgerSummary {
  earnedSkills: StoredEarnedSkill[];
  curve: LedgerCurvePoint[];
  latest?: StoredEarnedSkill;
  level: number;
  improvementPct: number;
  regressionEvents: number;
}

export interface WriteCardOptions {
  vaultRoot: string;
  outPath?: string;
  format?: "svg" | "md";
}

export interface WriteCardResult {
  path: string;
  content: string;
  summary: LedgerSummary;
}

export async function writeCandidateSkillToVault(skill: Skill, vaultRoot: string): Promise<string> {
  const candidate = SkillSchema.parse(skill);

  if (candidate.status !== "candidate") {
    throw new VaultWriteError("Refusing to write a non-candidate skill to the candidate queue");
  }

  await initializeVault(vaultRoot);

  const absolutePath = resolveManagedPath(vaultRoot, ".ratchet/candidates", `${candidate.id}.json`);
  await writeCanonicalJson(absolutePath, candidate, "candidate skill");

  return absolutePath;
}

export async function writePromotedSkillToVault(skill: Skill, vaultRoot: string): Promise<string> {
  const promotedSkill = SkillSchema.parse(skill);

  if (promotedSkill.status !== "promoted") {
    throw new VaultWriteError("Refusing to write an unpromoted skill as earned");
  }

  await initializeVault(vaultRoot);

  const canonicalPath = resolveManagedPath(
    vaultRoot,
    ".ratchet/skills",
    `${promotedSkill.id}.json`,
  );
  await writeCanonicalJson(canonicalPath, promotedSkill, "promoted skill");

  const mirrorPath = resolveManagedPath(
    vaultRoot,
    "skills",
    `${promotedSkill.provenance.createdAt.slice(0, 10)}-${slugify(promotedSkill.name)}.md`,
  );
  const markdown = renderSkillMarkdown(promotedSkill);

  assertNoSensitiveText(markdown, "rendered skill markdown");
  await mkdir(dirname(mirrorPath), { recursive: true });
  await writeFile(mirrorPath, markdown, "utf8");

  return canonicalPath;
}

export async function writeProofRunToVault(proofRun: ProofRun, vaultRoot: string): Promise<string> {
  const parsedProofRun = ProofRunSchema.parse(proofRun);

  await initializeVault(vaultRoot);

  const absolutePath = resolveManagedPath(
    vaultRoot,
    ".ratchet/proofs",
    `${parsedProofRun.id}.json`,
  );
  await writeCanonicalJson(absolutePath, parsedProofRun, "proof run");

  return absolutePath;
}

export async function appendLedgerEntryToVault(
  entry: LedgerEntry,
  vaultRoot: string,
): Promise<string> {
  const ledgerEntry = LedgerEntrySchema.parse(entry);

  await initializeVault(vaultRoot);

  const entries = await readLedgerEntries(vaultRoot);
  const sequence = entries.length + 1;
  const filename = `${sequence.toString().padStart(4, "0")}-${ledgerEntry.at.slice(0, 10)}-${
    ledgerEntry.event
  }-${ledgerEntry.skillId}.json`;
  const absolutePath = resolveManagedPath(vaultRoot, ".ratchet/ledger", filename);

  await writeCanonicalJson(absolutePath, ledgerEntry, "ledger entry", "wx");

  return absolutePath;
}

export async function readLedgerEntries(vaultRoot: string): Promise<LedgerEntry[]> {
  const ledgerRoot = resolveManagedPath(vaultRoot, ".ratchet/ledger");
  const filenames = await readDirectoryIfExists(ledgerRoot);
  const ledgerFiles = filenames.filter((name) => name.endsWith(".json")).sort();
  const entries: LedgerEntry[] = [];

  for (const filename of ledgerFiles) {
    const raw = await readFile(resolveManagedPath(vaultRoot, ".ratchet/ledger", filename), "utf8");
    entries.push(LedgerEntrySchema.parse(JSON.parse(raw) as unknown));
  }

  return entries;
}

export async function readSkillFromVault(vaultRoot: string, skillId: string): Promise<Skill> {
  const raw = await readFile(
    resolveManagedPath(vaultRoot, ".ratchet/skills", `${skillId}.json`),
    "utf8",
  );

  return SkillSchema.parse(JSON.parse(raw) as unknown);
}

export async function readProofRunFromVault(
  vaultRoot: string,
  proofRunId: string,
): Promise<ProofRun> {
  const raw = await readFile(
    resolveManagedPath(vaultRoot, ".ratchet/proofs", `${proofRunId}.json`),
    "utf8",
  );

  return ProofRunSchema.parse(JSON.parse(raw) as unknown);
}

export async function readEarnedSkills(vaultRoot: string): Promise<StoredEarnedSkill[]> {
  const entries = await readLedgerEntries(vaultRoot);
  const earnedSkills: StoredEarnedSkill[] = [];

  for (const entry of entries) {
    if (entry.event !== "promoted" || entry.proofRunId === undefined) {
      continue;
    }

    earnedSkills.push({
      entry,
      skill: await readSkillFromVault(vaultRoot, entry.skillId),
      proofRun: await readProofRunFromVault(vaultRoot, entry.proofRunId),
    });
  }

  return earnedSkills;
}

export async function summarizeLedger(vaultRoot: string): Promise<LedgerSummary> {
  const entries = await readLedgerEntries(vaultRoot);
  const earnedSkills = await readEarnedSkills(vaultRoot);
  const curve = entries
    .map((entry, index) => ({
      sequence: index + 1,
      at: entry.at,
      cumulativeSkills: entry.cumulativeSkills,
      benchmarkScore: entry.benchmarkScore ?? 0,
    }))
    .filter((point) => point.benchmarkScore > 0);
  const latest = earnedSkills.at(-1);
  const firstScore = curve[0]?.benchmarkScore ?? 0;
  const latestScore = curve.at(-1)?.benchmarkScore ?? firstScore;
  const improvementPct =
    firstScore > 0 ? Math.max(0, ((latestScore - firstScore) / firstScore) * 100) : 0;
  const regressionEvents = entries.filter(
    (entry) => entry.event === "retired" || entry.event === "quarantined",
  ).length;

  return {
    earnedSkills,
    curve,
    ...(latest === undefined ? {} : { latest }),
    level: calculateLevel(earnedSkills.length, improvementPct),
    improvementPct,
    regressionEvents,
  };
}

export function renderLedger(summary: LedgerSummary): string {
  if (summary.earnedSkills.length === 0) {
    return "No earned skills yet.";
  }

  const lines = [
    `Earned skills: ${summary.earnedSkills.length}`,
    `Level: ${summary.level}`,
    `Improvement curve: ${renderAsciiCurve(summary.curve)}`,
    "",
  ];

  for (const earned of summary.earnedSkills) {
    lines.push(
      [
        `- ${earned.skill.name}`,
        `  proof=${earned.proofRun.id}`,
        `verdict=${earned.proofRun.verdict}`,
        `delta=${formatSigned(earned.proofRun.measurement.delta)}`,
        `confidence=${earned.skill.trust.confidence.toFixed(2)}`,
        `trials=${earned.proofRun.measurement.trials}`,
      ].join(" "),
    );
  }

  return lines.join("\n");
}

export async function writeLedgerCard(options: WriteCardOptions): Promise<WriteCardResult> {
  const summary = await summarizeLedger(options.vaultRoot);
  const format = options.format ?? "svg";
  const outPath =
    options.outPath ??
    resolveManagedPath(options.vaultRoot, ".ratchet/cards", `ratchet-card.${format}`);
  const absolutePath = resolve(options.outPath ?? outPath);
  const content =
    format === "md" ? renderLedgerCardMarkdown(summary) : renderLedgerCardSvg(summary);

  assertNoSensitiveText(content, "rendered ledger card");
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");

  return {
    path: absolutePath,
    content,
    summary,
  };
}

export function renderLedgerCardMarkdown(summary: LedgerSummary): string {
  const latest = summary.latest;

  if (latest === undefined) {
    return [
      "# Ratchet Level-Up Card",
      "",
      "No earned skills yet.",
      "",
      `Curve: ${renderAsciiCurve(summary.curve)}`,
    ].join("\n");
  }

  return [
    "# Ratchet Level-Up Card",
    "",
    `Level ${summary.level} | ${formatSkillCount(summary.earnedSkills.length)} earned | ${
      summary.regressionEvents
    } regressions`,
    ...(shouldShowImprovement(summary)
      ? ["", `Improvement: ${formatImprovementPct(summary.improvementPct)} on yardstick baseline`]
      : []),
    "",
    `Curve: ${renderAsciiCurve(summary.curve)}`,
    "",
    `Latest skill: ${latest.skill.name}`,
    `Delta: ${formatSigned(latest.proofRun.measurement.delta)} | Trials: ${
      latest.proofRun.measurement.trials
    } | Confidence: ${latest.skill.trust.confidence.toFixed(2)}`,
    `Receipt: ${latest.proofRun.id}`,
  ].join("\n");
}

export function renderLedgerCardSvg(summary: LedgerSummary): string {
  const latest = summary.latest;
  const latestName = latest?.skill.name ?? "No earned skills yet";
  const latestDelta =
    latest === undefined ? "+0.000" : formatSigned(latest.proofRun.measurement.delta);
  const trials = latest?.proofRun.measurement.trials ?? 0;
  const receipt = latest?.proofRun.id ?? "none";
  const sparkline = renderSvgSparkline(summary.curve);
  const improvementLine = shouldShowImprovement(summary)
    ? `Improvement ${formatImprovementPct(summary.improvementPct)} on yardstick baseline`
    : "Yardstick baseline established";

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="620" viewBox="0 0 1080 620" role="img" aria-labelledby="title desc">',
    `<title id="title">Ratchet level ${summary.level} card</title>`,
    `<desc id="desc">${escapeXml(formatSkillCount(summary.earnedSkills.length))} earned with latest receipt ${escapeXml(
      receipt,
    )}</desc>`,
    "<defs>",
    "<style>",
    "text{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;fill:#111827}",
    ".muted{fill:#64748b}.label{font-size:24px}.small{font-size:20px}.headline{font-size:72px;font-weight:780}.metric{font-size:36px;font-weight:700}.mono{font-family:'SFMono-Regular',Consolas,monospace}",
    "</style>",
    "</defs>",
    '<rect width="1080" height="620" rx="28" fill="#f8fafc"/>',
    '<rect x="40" y="40" width="1000" height="540" rx="18" fill="#ffffff" stroke="#d1d5db"/>',
    '<text x="80" y="100" class="label mono" letter-spacing="3">RATCHET</text>',
    '<text x="80" y="185" class="headline">LEVEL ',
    escapeXml(summary.level.toString()),
    "</text>",
    `<text x="80" y="235" class="metric">${escapeXml(
      formatSkillCount(summary.earnedSkills.length),
    )} earned</text>`,
    `<text x="360" y="235" class="metric">${escapeXml(
      summary.regressionEvents.toString(),
    )} regressions</text>`,
    `<text x="80" y="278" class="small muted">${escapeXml(improvementLine)}</text>`,
    '<path d="M80 430 H1000" stroke="#e5e7eb" stroke-width="2"/>',
    sparkline,
    '<text x="80" y="500" class="small muted">Latest earned skill</text>',
    `<text x="80" y="535" class="metric">${escapeXml(truncate(latestName, 44))}</text>`,
    `<text x="80" y="568" class="small muted">delta ${escapeXml(
      latestDelta,
    )} | ${escapeXml(trials.toString())} trials | receipt ${escapeXml(receipt)}</text>`,
    "</svg>",
  ].join("");
}

function renderSkillMarkdown(skill: Skill): string {
  const proof = skill.proofs.at(-1);
  const proofLines =
    proof === undefined
      ? ["No proof recorded."]
      : [
          `- ProofRun: ${proof.id}`,
          `- Verdict: ${proof.verdict}`,
          `- Delta: ${formatSigned(proof.measurement.delta)}`,
          `- Trials: ${proof.measurement.trials}`,
          `- Confidence: ${skill.trust.confidence.toFixed(2)}`,
        ];

  return [
    "---",
    "ratchet: skill",
    `id: ${skill.id}`,
    `schemaVersion: ${skill.schemaVersion}`,
    `status: ${skill.status}`,
    `createdAt: ${skill.provenance.createdAt}`,
    "---",
    `# ${skill.name}`,
    "",
    "<!-- ratchet:begin type=skill -->",
    skill.body,
    "",
    "## Applicability",
    skill.applicability.description,
    "",
    "## Proof",
    ...proofLines,
    "<!-- ratchet:end type=skill -->",
  ].join("\n");
}

async function writeCanonicalJson(
  absolutePath: string,
  value: unknown,
  label: string,
  flag: "w" | "wx" = "w",
): Promise<void> {
  const json = `${JSON.stringify(value, null, 2)}\n`;

  assertNoSensitiveText(json, label);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, json, { encoding: "utf8", flag });
}

function calculateLevel(cumulativeSkills: number, improvementPct: number): number {
  const improvementBonus = Math.min(3, Math.max(0, improvementPct / 100));

  return Math.floor(Math.sqrt(cumulativeSkills) + improvementBonus);
}

function shouldShowImprovement(summary: LedgerSummary): boolean {
  return summary.earnedSkills.length >= 2 && summary.curve.length >= 2;
}

function formatSkillCount(count: number): string {
  return `${count} skill${count === 1 ? "" : "s"}`;
}

function formatImprovementPct(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function renderAsciiCurve(points: LedgerCurvePoint[]): string {
  if (points.length === 0) {
    return "(empty)";
  }

  return points.map((point) => point.benchmarkScore.toFixed(2)).join(" -> ");
}

function renderSvgSparkline(points: LedgerCurvePoint[]): string {
  if (points.length === 0) {
    return '<polyline points="80,390 1000,390" fill="none" stroke="#94a3b8" stroke-width="6"/>';
  }

  if (points.length === 1) {
    const [point] = points;
    const y = 390 - (point?.benchmarkScore ?? 0) * 120;

    return [
      '<polyline points="80,390 1000,',
      y.toFixed(1),
      '" fill="none" stroke="#2563eb" stroke-width="8" stroke-linecap="round"/>',
      `<circle cx="1000" cy="${y.toFixed(1)}" r="12" fill="#0f766e"/>`,
    ].join("");
  }

  const scores = points.map((point) => point.benchmarkScore);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const spread = Math.max(0.001, max - min);
  const coordinates = points.map((point, index) => {
    const x = 80 + (920 * index) / Math.max(1, points.length - 1);
    const y = 390 - ((point.benchmarkScore - min) / spread) * 160;

    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const latest = coordinates.at(-1) ?? "1000,390";
  const [latestX = "1000", latestY = "390"] = latest.split(",");

  return [
    `<polyline points="${coordinates.join(" ")}" fill="none" stroke="#2563eb" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<circle cx="${latestX}" cy="${latestY}" r="12" fill="#0f766e"/>`,
  ].join("");
}

function formatSigned(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(3)}`;
}

function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 3)}...`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function resolveManagedPath(vaultRoot: string, ...segments: string[]): string {
  for (const segment of segments) {
    if (isAbsolute(segment) || segment.split(/[\\/]/).includes("..")) {
      throw new VaultWriteError(`Unsafe managed vault path refused: ${segment}`);
    }
  }

  const root = resolve(vaultRoot);
  const resolved = resolve(root, ...segments);
  const relativePath = relative(root, resolved);

  if (relativePath.startsWith("..") || relativePath === "" || resolved === root) {
    throw new VaultWriteError(`Unsafe managed vault path refused: ${segments.join("/")}`);
  }

  if (resolved !== root && !resolved.startsWith(`${root}${sep}`)) {
    throw new VaultWriteError(`Unsafe managed vault path refused: ${segments.join("/")}`);
  }

  return resolved;
}

async function readDirectoryIfExists(path: string): Promise<string[]> {
  try {
    return await readdir(path);
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
