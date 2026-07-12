#!/usr/bin/env node
/** Fail CI if openapi/openapi.json is stale vs route tree. */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const specPath = path.join(root, "openapi/openapi.json");

if (!fs.existsSync(specPath)) {
  console.error("\nMissing openapi/openapi.json — run npm run openapi:generate\n");
  process.exit(1);
}

const before = fs.readFileSync(specPath, "utf8");
execSync("npm run openapi:generate", { cwd: root, stdio: "inherit" });
const after = fs.readFileSync(specPath, "utf8");

if (before !== after) {
  console.error("\nopenapi/openapi.json is out of date. Commit regenerated spec.\n");
  process.exit(1);
}
console.log("OpenAPI spec is up to date.");
