/**
 * Server-side environment validation. Never log secret values.
 */

import { getRuntimeDatabaseUrl, readEnvVar } from "@/lib/prisma-env";

const PLACEHOLDER_PATTERNS = [
  /^your-secret/i,
  /^replace-with/i,
  /^changeme/i,
  /^password@localhost/i,
  /^postgresql:\/\/user:password/i,
];

function isWeakSecret(value: string | undefined): boolean {
  if (!value || value.trim().length < 16) return true;
  return PLACEHOLDER_PATTERNS.some((p) => p.test(value.trim()));
}

export type EnvValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

export function validateServerEnv(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isProd = process.env.NODE_ENV === "production";

  const databaseUrl = getRuntimeDatabaseUrl();
  if (!databaseUrl) {
    errors.push("DATABASE_URL is required");
  } else if (
    isProd &&
    (databaseUrl.includes("pgbouncer=true") || databaseUrl.includes("pooler.")) &&
    !readEnvVar("DIRECT_DATABASE_URL")
  ) {
    warnings.push(
      "Pooled DATABASE_URL detected: set DIRECT_DATABASE_URL to a non-pooled Postgres URL for migrations, or use a single direct URL for both"
    );
  }

  const nextAuthSecret = readEnvVar("NEXTAUTH_SECRET");
  if (!nextAuthSecret) {
    errors.push("NEXTAUTH_SECRET is required");
  } else if (isProd && isWeakSecret(nextAuthSecret)) {
    errors.push("NEXTAUTH_SECRET must be a strong random value in production (min 16 chars)");
  }

  const nextAuthUrl = readEnvVar("NEXTAUTH_URL");
  if (isProd && nextAuthUrl && !nextAuthUrl.startsWith("https://")) {
    errors.push("NEXTAUTH_URL must use https:// in production");
  }

  const cronSecret = readEnvVar("CRON_SECRET");
  if (isProd && !cronSecret) {
    errors.push("CRON_SECRET is required in production for /api/cron/*");
  } else if (isProd && cronSecret && isWeakSecret(cronSecret)) {
    errors.push("CRON_SECRET must be a strong random value in production");
  }

  if (isProd && readEnvVar("ALLOW_DEMO_ACCOUNT_AUTO_LINK") === "true") {
    errors.push("ALLOW_DEMO_ACCOUNT_AUTO_LINK must not be true in production");
  }

  const qrSecret = readEnvVar("QR_SECRET");
  if (isProd && !qrSecret && nextAuthSecret && isWeakSecret(nextAuthSecret)) {
    warnings.push("Set QR_SECRET (dedicated) for attendance QR signing in production");
  }

  const serviceRole = readEnvVar("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceRole && !readEnvVar("NEXT_PUBLIC_SUPABASE_URL")) {
    warnings.push("SUPABASE_SERVICE_ROLE_KEY is set but NEXT_PUBLIC_SUPABASE_URL is missing");
  }

  return { ok: errors.length === 0, errors, warnings };
}

/** Throw on boot in production if critical env is invalid. */
export function assertProductionEnv(): void {
  if (process.env.NODE_ENV !== "production") return;

  const result = validateServerEnv();
  for (const w of result.warnings) {
    console.warn(`[env] ${w}`);
  }
  if (!result.ok) {
    throw new Error(
      `Invalid production environment:\n${result.errors.map((e) => `  - ${e}`).join("\n")}`
    );
  }
}
