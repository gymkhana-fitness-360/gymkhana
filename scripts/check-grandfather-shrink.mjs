#!/usr/bin/env node
/** Fail CI if eslint.grandfather-prisma-routes.json grows vs committed baseline. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const grandfatherPath = path.join(root, "eslint.grandfather-prisma-routes.json");
const baselinePath = path.join(root, "scripts/grandfather-prisma-routes.baseline.json");

const current = JSON.parse(fs.readFileSync(grandfatherPath, "utf8"));
const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));

if (!Array.isArray(current) || !Array.isArray(baseline)) {
  console.error("Grandfather lists must be JSON arrays");
  process.exit(1);
}

if (current.length > baseline.length) {
  console.error(
    `\nGrandfather Prisma route list grew (${baseline.length} → ${current.length}).\n` +
      "Migrate routes to domains instead of adding grandfather entries.\n",
  );
  process.exit(1);
}

const baselineSet = new Set(baseline);
const newEntries = current.filter((r) => !baselineSet.has(r));
if (newEntries.length > 0) {
  console.error("\nNew grandfather entries are not allowed:\n", newEntries.join("\n"));
  process.exit(1);
}

console.log(`Grandfather list OK (${current.length} routes, baseline ${baseline.length}).`);
