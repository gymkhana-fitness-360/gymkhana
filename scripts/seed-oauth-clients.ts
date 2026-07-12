/**
 * Creates demo ACCOUNT + AGENT OAuth clients for local testing (ADR-002).
 * Run: npx tsx scripts/seed-oauth-clients.ts
 * Prints secrets once — store in a password manager, not git.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "../src/lib/prisma";
import { createOAuthClient } from "../src/lib/oauth/clients";
import { DEFAULT_DEMO_ACCOUNT_ID, DEFAULT_DEMO_GYM_ID } from "../src/lib/gym-constants";
import { AGENT_SCOPES } from "../src/lib/rbac/agent-scopes";

async function main() {
  const account = await prisma.account.findUnique({
    where: { id: DEFAULT_DEMO_ACCOUNT_ID },
  });
  if (!account) {
    console.error("Demo account missing. Run prisma migrate + seed-demo-gym first.");
    process.exit(1);
  }

  const accountClient = await createOAuthClient({
    type: "ACCOUNT",
    accountId: DEFAULT_DEMO_ACCOUNT_ID,
    name: "Demo account integration",
  });

  const agentClient = await createOAuthClient({
    type: "AGENT",
    accountId: DEFAULT_DEMO_ACCOUNT_ID,
    gymId: DEFAULT_DEMO_GYM_ID,
    name: "Demo gym agent (MCP)",
    scopes: [...AGENT_SCOPES],
  });

  const mcpEnvPath = resolve(process.cwd(), ".env.mcp.local");
  writeFileSync(
    mcpEnvPath,
    [
      "# Auto-written by seed-oauth-clients.ts — run npm run mcp:setup for bearer token",
      "FITNESS360_API_URL=http://127.0.0.1:3000",
      `GYMFLO_MCP_CLIENT_ID=${agentClient.clientId}`,
      `GYMFLO_MCP_CLIENT_SECRET=${agentClient.clientSecret}`,
      "",
    ].join("\n"),
  );

  console.log("\n--- OAuth clients (save secrets now) ---\n");
  console.log("ACCOUNT client:");
  console.log("  client_id:", accountClient.clientId);
  console.log("  client_secret:", accountClient.clientSecret);
  console.log("  scopes:", accountClient.scopes.join(" "));
  console.log("\nAGENT client:");
  console.log("  client_id:", agentClient.clientId);
  console.log("  client_secret:", agentClient.clientSecret);
  console.log("  scopes:", agentClient.scopes.join(" "));
  console.log("\nMCP: wrote .env.mcp.local — with dev running, run: npm run mcp:setup");
  console.log("Then reload gymflo in Cursor → Settings → MCP");
  console.log("\nToken: POST /api/oauth/token");
  console.log(
    JSON.stringify(
      {
        grant_type: "client_credentials",
        client_id: agentClient.clientId,
        client_secret: "<secret>",
        scope: "read:overdue",
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
