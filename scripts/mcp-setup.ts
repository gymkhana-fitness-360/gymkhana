/**
 * Exchange AGENT OAuth client credentials for a bearer token → .env.mcp.local
 *
 * Prereqs: dev server running, demo gym + OAuth client seeded.
 *   npm run dev
 *   npm run db:seed-demo-gym
 *   npx tsx scripts/seed-oauth-clients.ts
 *   npm run mcp:setup
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "..");
const ENV_PATH = resolve(ROOT, ".env.mcp.local");

function parseEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function upsertEnvFile(path: string, updates: Record<string, string>) {
  const existing = existsSync(path) ? readFileSync(path, "utf8") : "";
  const lines = existing.length ? existing.split("\n") : [];
  const keys = new Set(Object.keys(updates));

  const merged = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return line;
    const eq = trimmed.indexOf("=");
    if (eq < 1) return line;
    const key = trimmed.slice(0, eq).trim();
    if (keys.has(key)) {
      keys.delete(key);
      return `${key}=${updates[key]}`;
    }
    return line;
  });

  for (const key of keys) {
    merged.push(`${key}=${updates[key]}`);
  }

  const body = merged.join("\n").replace(/\n*$/, "\n");
  writeFileSync(path, body);
}

async function main() {
  const env = {
    ...parseEnvFile(resolve(ROOT, ".env.mcp.example")),
    ...parseEnvFile(ENV_PATH),
  };

  const base = (env.FITNESS360_API_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
  const clientId = env.GYMFLO_MCP_CLIENT_ID;
  const clientSecret = env.GYMFLO_MCP_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error(
      "Missing GYMFLO_MCP_CLIENT_ID / GYMFLO_MCP_CLIENT_SECRET in .env.mcp.local\n",
    );
    console.error("Run:");
    console.error("  npm run db:seed-demo-gym");
    console.error("  npx tsx scripts/seed-oauth-clients.ts");
    console.error("  npm run mcp:setup");
    process.exit(1);
  }

  const scope =
    env.GYMFLO_MCP_SCOPES ??
    "read:overdue read:members read:payments read:analytics write:reminders";

  let res: Response;
  try {
    res = await fetch(`${base}/api/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        scope,
      }),
    });
  } catch (e) {
    console.error(`Cannot reach ${base} — is npm run dev running?`, e);
    process.exit(1);
  }

  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    scope?: string;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !json.access_token) {
    console.error("Token error:", json.error ?? res.status, json.error_description ?? "");
    process.exit(1);
  }

  upsertEnvFile(ENV_PATH, {
    FITNESS360_API_URL: base,
    FITNESS360_AGENT_TOKEN: json.access_token,
    GYMFLO_MCP_CLIENT_ID: clientId,
    GYMFLO_MCP_CLIENT_SECRET: clientSecret,
  });

  console.log("Updated .env.mcp.local");
  console.log("  FITNESS360_API_URL:", base);
  console.log("  FITNESS360_AGENT_TOKEN: gf_at_… (expires in", json.expires_in ?? "?", "s)");
  console.log("  scope:", json.scope);
  console.log("\nReload MCP in Cursor: Settings → MCP → gymflo → Restart");
  console.log("Token TTL ~1h — re-run npm run mcp:setup when tools return 401.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
