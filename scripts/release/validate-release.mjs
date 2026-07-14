#!/usr/bin/env node
/**
 * Validate package.json version, CHANGELOG, and docs/releases.json stay aligned.
 * Usage: node scripts/release/validate-release.mjs [--tag v0.2.0]
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const changelog = fs.readFileSync(path.join(ROOT, "CHANGELOG.md"), "utf8");
const manifestPath = path.join(ROOT, "docs", "releases.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

let tag = process.env.GITHUB_REF_NAME?.replace(/^refs\/tags\//, "");
const argIdx = process.argv.indexOf("--tag");
if (argIdx !== -1 && process.argv[argIdx + 1]) tag = process.argv[argIdx + 1];

const version = tag ? tag.replace(/^v/, "") : pkg.version;

const errors = [];

if (pkg.version !== version) {
  errors.push(`package.json version (${pkg.version}) !== release version (${version})`);
}

if (!changelog.includes(`## [${version}]`)) {
  errors.push(`CHANGELOG.md missing section ## [${version}]`);
}

const entry = manifest.releases?.find((r) => r.version === version);
if (!entry) {
  errors.push(`docs/releases.json missing release entry for ${version}`);
} else if (entry.githubTag !== `v${version}` && entry.githubTag !== tag) {
  errors.push(`docs/releases.json githubTag (${entry.githubTag}) does not match v${version}`);
}

if (errors.length) {
  console.error("Release validation failed:\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}

console.log(`Release ${version} OK — package.json, CHANGELOG, and releases.json aligned.`);
