#!/usr/bin/env tsx
/**
 * Fitness360 skill validation orchestrator — completion gates from commands/validate.md
 * Invoked by /dev-validate [--quick]
 */
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const QUICK = process.argv.includes("--quick");

type Status = "pass" | "fail" | "skip";

interface Gate {
  id: string;
  name: string;
  cmd: string;
  status: Status;
  detail?: string;
}

const gates: Gate[] = [];

function run(cmd: string): { ok: boolean; out: string } {
  try {
    const out = execSync(cmd, { cwd: REPO_ROOT, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    return { ok: true, out: out.trim() };
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string };
    return { ok: false, out: [err.stdout, err.stderr].filter(Boolean).join("\n").trim() };
  }
}

function record(id: string, name: string, cmd: string, ok: boolean, detail?: string) {
  const status: Status = ok ? "pass" : "fail";
  gates.push({ id, name, cmd, status, detail });
  const icon = ok ? "✓" : "✗";
  console.log(`${icon} ${name}${detail ? ` — ${detail}` : ""}`);
}

function main() {
  console.log("\nFitness360 skill validate\n");

  if (!QUICK) {
    const debug = run("tsx skills/scripts/debug.ts");
    record("G1", "Environment (/dev-debug)", "tsx skills/scripts/debug.ts", debug.ok, debug.ok ? undefined : "see /dev-debug output");
  } else {
    gates.push({ id: "G1", name: "Environment", cmd: "", status: "skip" });
    console.log("○ G1 Environment — skipped (--quick)");
  }

  const tc = run("npm run typecheck");
  record("G2", "TypeScript", "npm run typecheck", tc.ok, tc.ok ? undefined : tc.out.split("\n").slice(-3).join(" "));

  const tenant = run("npm run audit:tenant-scope:p0");
  record("G3", "Tenant scope P0", "npm run audit:tenant-scope:p0", tenant.ok);

  const zod = run("npm run audit:mutating-zod");
  record("G4", "Mutating Zod audit", "npm run audit:mutating-zod", zod.ok);

  const lint = run("npm run lint");
  record("G5", "ESLint", "npm run lint", lint.ok);

  if (!QUICK) {
    const tests = run("npm run test:ci");
    record("G6", "Unit tests (CI)", "npm run test:ci", tests.ok);

    console.log("○ G7 Schema — manual if prisma/schema changed (npx prisma migrate deploy)");
    console.log("○ G8 Smoke E2E — run npm run test:e2e:smoke if dashboard/auth changed");
    gates.push({ id: "G7", name: "Schema migration", cmd: "manual", status: "skip" });
    gates.push({ id: "G8", name: "Smoke E2E", cmd: "manual", status: "skip" });
  }

  const fails = gates.filter((g) => g.status === "fail").length;
  console.log(`\n${gates.length} gates — ${fails} failed\n`);

  if (fails > 0) {
    console.log("→ Route to skills/commands/fix.md\n");
    process.exit(1);
  }
}

main();
