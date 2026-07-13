#!/usr/bin/env node
/**
 * Extract GitHub Release notes for a semver tag from CHANGELOG.md.
 * Usage: node scripts/release/extract-changelog.mjs [--tag v0.2.0] [--out release-notes.md]
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const CHANGELOG = path.join(ROOT, "CHANGELOG.md");

function parseArgs() {
  const args = process.argv.slice(2);
  let tag = process.env.GITHUB_REF_NAME?.replace(/^refs\/tags\//, "");
  let out = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--tag" && args[i + 1]) tag = args[++i];
    else if (args[i] === "--out" && args[i + 1]) out = args[++i];
  }
  if (!tag) {
    console.error("Missing --tag vX.Y.Z");
    process.exit(1);
  }
  const version = tag.replace(/^v/, "");
  return { tag, version, out };
}

function extractSection(changelog, version) {
  const header = `## [${version}]`;
  const start = changelog.indexOf(header);
  if (start === -1) {
    throw new Error(`No CHANGELOG section for version ${version} (${header})`);
  }
  const rest = changelog.slice(start + header.length);
  const next = rest.search(/\n## \[/);
  const body = (next === -1 ? rest : rest.slice(0, next)).trim();
  const dateMatch = body.match(/^- (\d{4}-\d{2}-\d{2})/);
  const date = dateMatch?.[1] ?? "";
  const content = body.replace(/^- \d{4}-\d{2}-\d{2}\s*\n?/, "").trim();
  return { version, date, content };
}

const { tag, version, out } = parseArgs();
const changelog = fs.readFileSync(CHANGELOG, "utf8");
const { content } = extractSection(changelog, version);

const notes = `# ${tag}\n\n${content}\n\n---\n\n**Full changelog:** [CHANGELOG.md](https://github.com/gymkhana-fitness-360/gymkhana/blob/main/CHANGELOG.md)\n`;

if (out) {
  fs.writeFileSync(out, notes);
  console.log(`Wrote ${out}`);
} else {
  process.stdout.write(notes);
}
