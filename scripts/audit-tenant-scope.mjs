#!/usr/bin/env node
/**
 * GYM-P0-004: Report Prisma findMany/findFirst calls that may lack gymId scoping.
 * Usage: node scripts/audit-tenant-scope.mjs [--json]
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "src");
const GYM_ID_IN_WHERE = /\bgymId\b/;
const SCOPED_HELPERS = [
  "resolveGymIdForUser",
  "getApiGymId",
  "requireApiGymId",
  "userCanAccessGym",
  "memberBelongsToGym",
  "detectOverdueMembers",
  "markStaleOverdueInactiveForGym",
  "resolveOverdueOnPayment",
];
const PRISMA_READ = /prisma\.\w+\.(findMany|findFirst|findUnique|groupBy)\s*\(/g;

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === "__tests__") continue;
      walk(full, acc);
    } else if (/\.(ts|tsx)$/.test(name)) {
      acc.push(full);
    }
  }
  return acc;
}

function auditFile(filePath) {
  const rel = path.relative(ROOT, filePath);
  const text = fs.readFileSync(filePath, "utf8");
  const lines = text.split("\n");
  const findings = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!PRISMA_READ.test(line)) {
      PRISMA_READ.lastIndex = 0;
      continue;
    }
    PRISMA_READ.lastIndex = 0;

    const windowStart = Math.max(0, i - 8);
    const windowEnd = Math.min(lines.length, i + 25);
    const window = lines.slice(windowStart, windowEnd).join("\n");

    if (GYM_ID_IN_WHERE.test(window)) continue;
    if (SCOPED_HELPERS.some((h) => window.includes(h))) continue;

    findings.push({
      file: rel,
      line: i + 1,
      snippet: line.trim().slice(0, 120),
    });
  }

  return findings;
}

/** Routes and domain files that must stay gym-scoped (AUDIT-027). */
const P0_ROUTE_FILES = [
  "src/app/api/payments/deduplicate/route.ts",
  "src/app/api/payments/fix-missing-memberships/route.ts",
  "src/app/api/members/fix-date/route.ts",
  "src/app/api/settings/route.ts",
  "src/app/api/audit/route.ts",
  "src/domains/collections/services/overdue.service.ts",
  "src/domains/collections/handlers/mark-stale-overdue-inactive.ts",
];

const allFindings = walk(SRC).flatMap(auditFile);
const json = process.argv.includes("--json");
const failOnP0 = process.argv.includes("--fail-on-p0");

const p0Hits = allFindings.filter((f) => P0_ROUTE_FILES.includes(f.file));

if (json) {
  console.log(
    JSON.stringify({ count: allFindings.length, p0Hits: p0Hits.length, findings: allFindings }, null, 2),
  );
} else {
  console.log(`Tenant scope audit: ${allFindings.length} potential unscoped Prisma read(s)\n`);
  for (const f of allFindings) {
    console.log(`  ${f.file}:${f.line}  ${f.snippet}`);
  }
  if (failOnP0 && p0Hits.length > 0) {
    console.error(`\nP0 regression: ${p0Hits.length} unscoped read(s) in payment/member maintenance routes.`);
  } else {
    console.log("\nReview each call site; add gymId to where or use a scoped domain helper.");
  }
}

const exitCode = failOnP0 ? (p0Hits.length > 0 ? 1 : 0) : allFindings.length > 0 ? 1 : 0;
process.exit(exitCode);
