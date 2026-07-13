#!/usr/bin/env node
/**
 * Product-local wrapper for gymkhana-skills validation gates.
 * Works from a product-only clone (sibling gymkhana-skills) or skills/ mount.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const productRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

const candidates = [
  path.join(productRoot, "skills", "scripts", "validate.ts"),
  path.join(productRoot, "..", "gymkhana-skills", "scripts", "validate.ts"),
];

const validateScript = candidates.find((p) => fs.existsSync(p));

if (validateScript) {
  const result = spawnSync("npx", ["tsx", validateScript, ...args], {
    cwd: productRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  process.exit(result.status ?? 1);
}

// Fallback: inline core gates when skills repo is not present
const steps = [
  ["npm run typecheck", "TypeScript"],
  ["npm run audit:tenant-scope:p0", "Tenant scope P0"],
  ["npm run audit:mutating-zod", "Mutating Zod"],
  ["npm run lint", "ESLint"],
];

if (!args.includes("--quick")) {
  steps.push(["npm run test:ci", "Unit tests"]);
}

let failed = 0;
for (const [cmd, label] of steps) {
  const result = spawnSync(cmd, {
    cwd: productRoot,
    stdio: "inherit",
    shell: true,
  });
  if (result.status !== 0) {
    console.error(`✗ ${label}`);
    failed++;
  } else {
    console.log(`✓ ${label}`);
  }
}

process.exit(failed > 0 ? 1 : 0);
