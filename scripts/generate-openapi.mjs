#!/usr/bin/env node
/**
 * Generates openapi/openapi.json from API route audit (GYM-M1-003).
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const API_DIR = join(ROOT, "src/app/api");

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (name === "route.ts") acc.push(p);
  }
  return acc;
}

const paths = {};
for (const file of walk(API_DIR)) {
  const rel = relative(join(ROOT, "src/app/api"), file).replace(/\\/g, "/");
  const routePath =
    "/" +
    rel
      .replace(/\/route\.ts$/, "")
      .replace(/\[([^\]]+)\]/g, "{$1}");
  const src = readFileSync(file, "utf8");
  const methods = [];
  const methodNames = ["GET", "POST", "PUT", "PATCH", "DELETE"];
  for (const name of methodNames) {
    const fnExport = new RegExp(`\\bexport\\s+async\\s+function\\s+${name}\\b`);
    const constExport = new RegExp(`\\bexport\\s+const\\s+${name}\\b`);
    if (fnExport.test(src) || constExport.test(src)) {
      methods.push(name.toLowerCase());
    }
  }
  if (methods.length === 0) continue;

  paths[routePath] = {};
  for (const m of methods) {
    const isV1 = routePath.startsWith("/v1/");
    const isCron = routePath.startsWith("/cron");
    const isWebhook = routePath.startsWith("/webhooks");
    paths[routePath][m] = {
      summary: `${m.toUpperCase()} ${routePath}`,
      responses: { "200": { description: "OK" } },
      security: isCron || isWebhook
        ? []
        : isV1
          ? [{ apiKeyAuth: [] }]
          : [{ cookieAuth: [] }],
    };
  }
}

const agentTools = [
  "searchMembers",
  "getOverdues",
  "listChaseCandidates",
  "getChasePlan",
  "sendReminder",
  "getAttendanceHeatmap",
  "listActiveTrials",
  "getTrainerLeaderboard",
  "getMemberInsights",
  "getPaymentTimingInsights",
  "listOffers",
  "createOffer",
  "draftEngagement",
  "getRenewals",
  "convertTrialToMember",
  "createMembership",
  "cancelMembership",
  "getOperatingHoursFact",
  "recommendProducts",
  "listLeads",
  "createLead",
  "updateLead",
  "convertLeadToTrial",
  "listLeadsDueForFollowUp",
];

for (const tool of agentTools) {
  paths[`/agent/v1/tools/${tool}`] = {
    post: {
      summary: `Agent tool: ${tool}`,
      description: "OAuth Bearer + agent scopes. See ADR-002.",
      security: [{ bearerAuth: [] }],
      responses: { "200": { description: "Tool result" } },
    },
  };
}

const spec = {
  openapi: "3.0.3",
  info: {
    title: "Fitness360 API",
    version: "1.0.0",
    description: "Generated from App Router route files + agent tool registry (GYM-OS-C-006)",
  },
  servers: [{ url: "/api" }],
  components: {
    securitySchemes: {
      cookieAuth: { type: "apiKey", in: "cookie", name: "next-auth.session-token" },
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "OAuth" },
      apiKeyAuth: { type: "apiKey", in: "header", name: "x-api-key" },
    },
  },
  paths,
};

const out = join(ROOT, "openapi/openapi.json");
writeFileSync(out, JSON.stringify(spec, null, 2));
console.log(`Wrote ${Object.keys(paths).length} paths to ${out}`);
