#!/usr/bin/env tsx
/**
 * Skill learner — captures when implementation diverges from skill guidance.
 *
 * Invoked by /dev-learn <mode>
 */
import { execSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(SKILLS_DIR, "..");
const LEARNINGS_DIR = path.join(SKILLS_DIR, "learnings");
const JSONL_PATH = path.join(LEARNINGS_DIR, "captured.jsonl");
const SUMMARY_PATH = path.join(LEARNINGS_DIR, "LEARNINGS.md");

export interface Learning {
  id: string;
  timestamp: string;
  skill: string;
  suggested: string;
  actual: string;
  reason?: string;
  files: string[];
  tags: string[];
  source: "manual" | "git-diff" | "auto";
}

interface AutoRule {
  tag: string;
  skill: string;
  pattern: RegExp;
  suggested: string;
  actual: string;
}

const AUTO_RULES: AutoRule[] = [
  {
    tag: "ui-tokens",
    skill: "dev",
    pattern: /(?:bg|text|border)-(?:gray|slate|zinc)-\d+/,
    suggested: "Use semantic tokens (bg-background, text-muted-foreground, border-border)",
    actual: "Hardcoded Tailwind gray/slate/zinc scale",
  },
  {
    tag: "api-thin-route",
    skill: "dev",
    pattern: /prisma\.\w+\.(?:create|update|delete|upsert)\(/,
    suggested: "Keep Prisma mutations in domain handlers under src/domains/",
    actual: "Direct Prisma mutation in route or component",
  },
  {
    tag: "currency",
    skill: "dev",
    pattern: /₹|INR|toLocaleString\([^)]*en-IN/,
    suggested: "Use formatCurrency() from @/lib/utils for money display",
    actual: "Inline currency formatting",
  },
  {
    tag: "tenant-scope",
    skill: "dev",
    pattern: /prisma\.\w+\.find(?:Many|First|Unique)\([^)]*\)(?![\s\S]{0,200}(?:accountId|gymId|where:\s*\{[^}]*(?:account|gym)))/,
    suggested: "Scope queries by accountId/gymId — see audit:tenant-scope",
    actual: "Prisma query may lack tenant scope",
  },
];

function ensureDir() {
  fs.mkdirSync(LEARNINGS_DIR, { recursive: true });
  if (!fs.existsSync(JSONL_PATH)) fs.writeFileSync(JSONL_PATH, "", "utf8");
}

function parseFlags(argv: string[]): Record<string, string | boolean> {
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) flags[key] = true;
      else {
        flags[key] = next;
        i++;
      }
    }
  }
  return flags;
}

function readAll(): Learning[] {
  if (!fs.existsSync(JSONL_PATH)) return [];
  return fs
    .readFileSync(JSONL_PATH, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Learning);
}

function append(entry: Learning) {
  ensureDir();
  fs.appendFileSync(JSONL_PATH, `${JSON.stringify(entry)}\n`, "utf8");
  console.log(`→ captured learning ${entry.id} (${entry.source})`);
}

function git(cmd: string): string {
  return execSync(cmd, { cwd: REPO_ROOT, encoding: "utf8" }).trim();
}

function gitDiff(ref: string): string {
  try {
    return git(`git diff ${ref}`);
  } catch {
    return "";
  }
}

function gitFiles(ref: string): string[] {
  try {
    return git(`git diff ${ref} --name-only`).split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

function detectAuto(diff: string, files: string[]): Omit<Learning, "id" | "timestamp">[] {
  const hits: Omit<Learning, "id" | "timestamp">[] = [];
  const seen = new Set<string>();

  for (const rule of AUTO_RULES) {
    if (!rule.pattern.test(diff)) continue;
    const key = `${rule.tag}:${rule.suggested}`;
    if (seen.has(key)) continue;
    seen.add(key);
    hits.push({
      skill: rule.skill,
      suggested: rule.suggested,
      actual: rule.actual,
      reason: `Auto-detected in diff (${rule.tag})`,
      files: files.filter((f) => diff.includes(f) || rule.pattern.test(diff)),
      tags: [rule.tag, "auto"],
      source: "auto",
    });
  }
  return hits;
}

function makeEntry(partial: Omit<Learning, "id" | "timestamp">): Learning {
  return {
    id: crypto.randomBytes(4).toString("hex"),
    timestamp: new Date().toISOString(),
    ...partial,
  };
}

function cmdCapture(flags: Record<string, string | boolean>) {
  const skill = String(flags.skill ?? "dev");
  const suggested = String(flags.suggested ?? "");
  const actual = String(flags.actual ?? "");
  if (!suggested || !actual) {
    console.error("capture requires --suggested and --actual");
    process.exit(1);
  }
  const files = flags.files ? String(flags.files).split(",").map((s) => s.trim()) : [];
  const tags = flags.tags ? String(flags.tags).split(",").map((s) => s.trim()) : ["manual"];
  append(
    makeEntry({
      skill,
      suggested,
      actual,
      reason: flags.reason ? String(flags.reason) : undefined,
      files,
      tags,
      source: "manual",
    }),
  );
  summarize();
}

function cmdFromGit(flags: Record<string, string | boolean>) {
  const ref = flags.staged ? "--staged" : String(flags.since ?? "HEAD");
  const diff = gitDiff(ref);
  const files = gitFiles(ref);
  if (!diff && files.length === 0) {
    console.log("No git diff found.");
    return;
  }
  const skill = String(flags.skill ?? "dev");
  const suggested = String(flags.suggested ?? "See skill references for this area");
  const actual = flags.actual
    ? String(flags.actual)
    : `Git diff ${ref} (${files.length} files):\n${diff.slice(0, 1500)}${diff.length > 1500 ? "\n…" : ""}`;

  append(
    makeEntry({
      skill,
      suggested,
      actual,
      reason: flags.reason ? String(flags.reason) : `Recorded from git diff ${ref}`,
      files,
      tags: ["git-diff"],
      source: "git-diff",
    }),
  );
  summarize();
}

function cmdAuto(flags: Record<string, string | boolean>) {
  const ref = flags.staged ? "--staged" : String(flags.since ?? "HEAD");
  const diff = gitDiff(ref);
  const files = gitFiles(ref);
  if (!diff) {
    console.log("No diff to analyze.");
    return;
  }
  const hits = detectAuto(diff, files);
  if (hits.length === 0) {
    console.log("No skill divergences auto-detected.");
    return;
  }
  for (const hit of hits) {
    append(makeEntry(hit));
  }
  summarize();
}

function cmdList(flags: Record<string, string | boolean>) {
  const limit = Number(flags.limit ?? 20);
  const entries = readAll().slice(-limit).reverse();
  if (entries.length === 0) {
    console.log("No learnings captured yet.");
    return;
  }
  for (const e of entries) {
    console.log(`[${e.timestamp}] ${e.skill} (${e.source}) ${e.id}`);
    console.log(`  suggested: ${e.suggested.slice(0, 120)}`);
    console.log(`  actual:    ${e.actual.slice(0, 120)}`);
    if (e.files.length) console.log(`  files:     ${e.files.join(", ")}`);
    console.log("");
  }
}

export function summarize() {
  ensureDir();
  const entries = readAll();
  const bySkill = new Map<string, Learning[]>();
  for (const e of entries) {
    const list = bySkill.get(e.skill) ?? [];
    list.push(e);
    bySkill.set(e.skill, list);
  }

  const lines: string[] = [
    "# Captured skill learnings",
    "",
    "Auto-maintained by `/dev-learn summarize`. Do not hand-edit entries below the fold.",
    "",
    `Last updated: ${new Date().toISOString()}`,
    `Total entries: ${entries.length}`,
    "",
    "## How to add",
    "",
    "```bash",
    "/dev-learn capture --skill dev --suggested \"use Dialog\" --actual \"used Sheet\" --reason \"mobile\"",
    "/dev-learn from-git --skill dev --suggested \"domain handler pattern\"",
    "/dev-learn auto --staged",
    "```",
    "",
  ];

  for (const [skill, list] of bySkill) {
    lines.push(`## ${skill}`, "");
    const recent = [...list].reverse().slice(0, 30);
    for (const e of recent) {
      lines.push(`### ${e.timestamp.slice(0, 10)} — \`${e.id}\` (${e.source})`, "");
      lines.push(`- **Skill suggested:** ${e.suggested}`);
      lines.push(`- **What we did:** ${e.actual.split("\n")[0]}`);
      if (e.reason) lines.push(`- **Why:** ${e.reason}`);
      if (e.files.length) lines.push(`- **Files:** ${e.files.map((f) => `\`${f}\``).join(", ")}`);
      if (e.tags.length) lines.push(`- **Tags:** ${e.tags.join(", ")}`);
      lines.push("");
    }
  }

  fs.writeFileSync(SUMMARY_PATH, lines.join("\n"), "utf8");
  console.log(`→ updated ${SUMMARY_PATH}`);
}

function main() {
  const [command, ...rest] = process.argv.slice(2);
  const flags = parseFlags(rest);

  if (!command || command === "help" || flags.help) {
    console.log(`Usage (/dev-learn):
  /dev-learn capture --skill dev --suggested "..." --actual "..." [--reason] [--files a,b]
  /dev-learn from-git --skill dev --suggested "..." [--since HEAD] [--staged]
  /dev-learn auto [--staged] [--since HEAD]
  /dev-learn list [--limit 20]
  /dev-learn summarize

Agent executes: tsx skills/scripts/learner.ts <mode> [options]`);
    return;
  }

  switch (command) {
    case "capture":
      cmdCapture(flags);
      break;
    case "from-git":
      cmdFromGit(flags);
      break;
    case "auto":
      cmdAuto(flags);
      break;
    case "list":
      cmdList(flags);
      break;
    case "summarize":
      summarize();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

main();
