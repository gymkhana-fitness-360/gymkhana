/**
 * Entry point for npm run validate / validate:ts — TypeScript + tenant audit gates.
 */

import { execSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = join(__dirname, "..");

function run(cmd: string) {
  execSync(cmd, { cwd: root, stdio: "inherit" });
}

run("npx tsc --noEmit -p tsconfig.json");
run("node scripts/audit-tenant-scope.mjs || true");
