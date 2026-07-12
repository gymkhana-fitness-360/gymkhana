#!/usr/bin/env tsx
/**
 * Fitness360 local debugger — extends CLI doctor with env, DB, and app checks.
 * Invoked by /dev-debug [--deep]
 */
import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const DEEP = process.argv.includes("--deep");

type Status = "pass" | "fail" | "warn" | "skip";

interface Check {
  name: string;
  status: Status;
  detail?: string;
}

const checks: Check[] = [];

function add(name: string, status: Status, detail?: string) {
  checks.push({ name, status, detail });
  const icon = { pass: "✓", fail: "✗", warn: "⚠", skip: "○" }[status];
  console.log(`${icon} ${name}${detail ? ` — ${detail}` : ""}`);
}

function run(cmd: string, cwd = REPO_ROOT): string | null {
  try {
    return execSync(cmd, { cwd, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch {
    return null;
  }
}

function commandExists(cmd: string): boolean {
  return spawnSync("which", [cmd], { stdio: "ignore" }).status === 0;
}

function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

function portOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" });
    socket.setTimeout(800);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function checkNode() {
  const major = Number(process.version.slice(1).split(".")[0]);
  const minor = Number(process.version.slice(1).split(".")[1] ?? 0);
  const ok = major > 20 || (major === 20 && minor >= 9);
  add("Node.js >= 20.9", ok ? "pass" : "fail", process.version);
}

function checkTools() {
  add("npm", commandExists("npm") ? "pass" : "fail");
  add("git", commandExists("git") ? "pass" : "warn", commandExists("git") ? undefined : "optional");
  add("docker", commandExists("docker") ? "pass" : "warn", commandExists("docker") ? undefined : "recommended for local Postgres");
}

function checkEnv() {
  const envPath = path.join(REPO_ROOT, ".env");
  if (!fs.existsSync(envPath)) {
    add(".env file", "fail", "missing — run npx @fitness360/cli init --here");
    return;
  }
  add(".env file", "pass");
  const env = parseEnvFile(envPath);
  const required = ["DATABASE_URL", "NEXTAUTH_URL", "NEXTAUTH_SECRET"] as const;
  for (const key of required) {
    add(`env ${key}`, env[key] ? "pass" : "fail", env[key] ? undefined : "not set");
  }
}

function checkPostgres(env: Record<string, string>) {
  const url = env.DATABASE_URL;
  if (!url) {
    add("Postgres connectivity", "skip", "no DATABASE_URL");
    return;
  }
  const pgUp = run("docker ps --filter name=fitness360-pg --format '{{.Status}}'");
  if (pgUp) add("Postgres container", "pass", pgUp.split("\n")[0]);
  else add("Postgres container", "warn", "fitness360-pg not running — docker compose up -d postgres");

  const migrate = run("npx prisma migrate status 2>&1", REPO_ROOT);
  if (migrate?.includes("Database schema is up to date")) add("Prisma migrate status", "pass");
  else if (migrate?.includes("have not yet been applied")) add("Prisma migrate status", "fail", "pending migrations — npx prisma migrate deploy");
  else if (migrate?.includes("Could not create")) add("Prisma DB connection", "fail", "cannot reach database");
  else add("Prisma migrate status", migrate ? "warn" : "fail", migrate?.split("\n")[0] ?? "unknown");
}

function checkPrismaClient() {
  const client = path.join(REPO_ROOT, "node_modules/.prisma/client/index.js");
  add("Prisma client generated", fs.existsSync(client) ? "pass" : "warn", fs.existsSync(client) ? undefined : "run npm run db:generate");
}

function checkHomeLockfile() {
  const homeLock = path.join(process.env.HOME ?? "", "package-lock.json");
  if (fs.existsSync(homeLock)) add("~/package-lock.json", "warn", "can break Next.js resolution — rename or remove");
  else add("~/package-lock.json", "pass", "not present");
}

async function checkPorts() {
  const p3000 = await portOpen(3000);
  add("Port 3000", p3000 ? "warn" : "pass", p3000 ? "in use (dev server may already run)" : "free");
  const p5432 = await portOpen(5432);
  add("Port 5432", p5432 ? "pass" : "warn", p5432 ? "Postgres likely listening" : "nothing on 5432");
}

function checkDeep() {
  console.log("\n— deep checks —\n");
  const tc = run("npm run typecheck 2>&1", REPO_ROOT);
  add("Typecheck", tc !== null && !tc.includes("error TS") ? "pass" : "fail");
  const lint = run("npm run lint 2>&1 | tail -5", REPO_ROOT);
  add("Lint", lint !== null ? "pass" : "warn", "see npm run lint for details");
}

async function main() {
  console.log("\nFitness360 debugger\n");
  const env = parseEnvFile(path.join(REPO_ROOT, ".env"));

  checkNode();
  checkTools();
  checkEnv();
  checkPostgres(env);
  checkPrismaClient();
  checkHomeLockfile();
  await checkPorts();

  if (DEEP) checkDeep();

  const fails = checks.filter((c) => c.status === "fail").length;
  const warns = checks.filter((c) => c.status === "warn").length;
  console.log(`\n${checks.length} checks — ${fails} failed, ${warns} warnings\n`);
  if (fails > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
