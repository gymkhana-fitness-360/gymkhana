/**
 * Non-database env helpers for API routes (no secrets logged).
 */

import { readEnvVar } from "@/lib/prisma-env";

/** Public app URL for links in messages — NEXTAUTH_URL only (no VERCEL_URL fallback). */
export function getAppBaseUrl(): string {
  const url = readEnvVar("NEXTAUTH_URL");
  if (url) return url.replace(/\/$/, "");
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }
  throw new Error("NEXTAUTH_URL is required");
}

export function getCronSecret(): string | undefined {
  return readEnvVar("CRON_SECRET");
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Local-only Inngest jobs that shell out (rm -rf .next, npm install). Never on Vercel prod. */
export function isDevSelfHealEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.ENABLE_DEV_SELF_HEAL === "true"
  );
}

/** Agent/MCP settings UI and /api/agent routes (playground/docs live on cloud). */
export function isAgentApiEnabled(): boolean {
  return process.env.ENABLE_AGENT_API === "true";
}
