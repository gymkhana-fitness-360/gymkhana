#!/usr/bin/env node
/** GYM-CI-006 / M0-007: fail CI when mutating API routes lack Zod validation */
import fs from "node:fs";
import path from "node:path";

const apiDir = path.join(import.meta.dirname, "..", "src/app/api");
const allowlist = new Set([
  // Cron: CRON_SECRET auth, not JSON body
  "src/app/api/cron/daily-overdue-report/route.ts",
  // Multipart upload
  "src/app/api/members/photo/route.ts",
  // MCP JSON-RPC — validated in domain layer
  "src/app/api/mcp/route.ts",
  // OAuth form body
  "src/app/api/oauth/token/route.ts",
  // Agent client token rotation
  "src/app/api/settings/agent-clients/[clientId]/token/route.ts",
]);

const hints = [
  "z.object",
  "parseValidatedBody",
  ".safeParse(",
  "parseJsonBody",
  "createApiHandler",
  "bodySchema",
  "mutatingBodySchema",
];

const zAnyForbidden = [];
function scanZAny(dir, base = path.join(import.meta.dirname, "..", "src")) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) scanZAny(p, base);
    else if (name.endsWith(".ts") || name.endsWith(".tsx")) {
      const text = fs.readFileSync(p, "utf8");
      if (/\bz\.any\s*\(/.test(text)) {
        zAnyForbidden.push(path.relative(base, p).replace(/\\/g, "/"));
      }
    }
  }
}
scanZAny(path.join(import.meta.dirname, "..", "src"));

const skipPatterns = [
  /Handler\s*\(/,
  /from\s+["']@\/domains\//,
];

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, files);
    else if (name === "route.ts") files.push(p);
  }
  return files;
}

const missing = [];
for (const file of walk(apiDir)) {
  const rel = path.relative(path.join(import.meta.dirname, ".."), file);
  if (allowlist.has(rel)) continue;
  const text = fs.readFileSync(file, "utf8");
  if (!/export async function (POST|PUT|PATCH)\b/.test(text)) continue;
  if (hints.some((h) => text.includes(h))) continue;
  if (skipPatterns.some((re) => re.test(text))) continue;
  missing.push(path.relative(path.join(import.meta.dirname, ".."), file));
}

if (missing.length) {
  console.error(`Mutating routes without Zod validation (${missing.length}):`);
  missing.slice(0, 40).forEach((f) => console.error(`  ${f}`));
  if (missing.length > 40) console.error(`  ... and ${missing.length - 40} more`);
  process.exit(1);
}

if (zAnyForbidden.length) {
  console.error(`z.any() is forbidden (${zAnyForbidden.length}):`);
  zAnyForbidden.forEach((f) => console.error(`  src/${f}`));
  process.exit(1);
}

console.log("All mutating routes use Zod or domain handlers.");
