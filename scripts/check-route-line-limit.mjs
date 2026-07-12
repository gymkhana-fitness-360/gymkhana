#!/usr/bin/env node
/** Warn when non-grandfathered API route.ts files exceed line budget (M0 thin routes). */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiRoot = path.join(root, "src/app/api");
const grandfather = new Set(
  JSON.parse(
    fs.readFileSync(path.join(root, "eslint.grandfather-prisma-routes.json"), "utf8"),
  ),
);
const MAX_LINES = Number(process.env.ROUTE_MAX_LINES ?? 80);
const FAIL = process.env.ROUTE_LINE_LIMIT_STRICT === "1";

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name);
    if (fs.statSync(abs).isDirectory()) walk(abs, acc);
    else if (name === "route.ts") acc.push(abs);
  }
  return acc;
}

const offenders = [];
for (const abs of walk(apiRoot)) {
  const rel = path.relative(root, abs).replace(/\\/g, "/");
  if (grandfather.has(rel)) continue;
  const lines = fs.readFileSync(abs, "utf8").split("\n").length;
  if (lines > MAX_LINES) offenders.push({ rel, lines });
}

if (offenders.length === 0) {
  console.log(`Route line limit OK (≤${MAX_LINES} lines, non-grandfathered).`);
  process.exit(0);
}

const msg =
  `\n${offenders.length} non-grandfathered route(s) exceed ${MAX_LINES} lines:\n` +
  offenders.map((o) => `  ${o.lines}\t${o.rel}`).join("\n");

if (FAIL) {
  console.error(msg);
  process.exit(1);
}

console.warn(msg);
process.exit(0);
