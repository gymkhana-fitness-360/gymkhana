#!/usr/bin/env node
/** GYM-CI-004: fail if API_ROUTE_AUDIT.md is stale */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const auditPath = path.join(root, "docs/API_ROUTE_AUDIT.md");
const before = fs.readFileSync(auditPath, "utf8");

execSync("npm run audit:api-routes", { cwd: root, stdio: "inherit" });

const after = fs.readFileSync(auditPath, "utf8");
if (before !== after) {
  console.error(
    "\nAPI_ROUTE_AUDIT.md is out of date. Commit regenerated docs/API_ROUTE_AUDIT.md\n",
  );
  process.exit(1);
}
console.log("API route audit is up to date.");
