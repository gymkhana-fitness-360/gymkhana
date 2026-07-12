import { prisma } from "@/lib/prisma";
import { createOAuthClient } from "@/lib/oauth/clients";
import {
  buildMcpConnectPayload,
  resolveMcpTokenTtlSeconds,
} from "@/lib/oauth/mcp-connect";
import { issueClientCredentialsToken } from "@/lib/oauth/tokens";
import {
  AGENT_SCOPES,
  DEFAULT_AGENT_CLIENT_SCOPES,
  type AgentScope,
} from "@/lib/rbac/agent-scopes";
import { ensureToolRegistry, executeTool } from "@/platform/tools/registry";

export async function listAgentClientsForGym(gymId: string) {
  return prisma.oAuthClient.findMany({
    where: { gymId, type: "AGENT" },
    select: {
      clientId: true,
      name: true,
      scopes: true,
      isActive: true,
      revokedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export function resolveAgentClientScopes(readOnly: boolean): AgentScope[] {
  return readOnly ? [...DEFAULT_AGENT_CLIENT_SCOPES] : [...AGENT_SCOPES];
}

export async function createAgentClientForGym(
  accountId: string,
  gymId: string,
  name: string,
  options?: { readOnly?: boolean },
) {
  // Secure by default: read-only scopes unless the caller explicitly opts into
  // write access (readOnly: false). Omitting the flag never grants write:reminders.
  const readOnly = options?.readOnly !== false;
  const scopes = resolveAgentClientScopes(readOnly);
  const created = await createOAuthClient({
    type: "AGENT",
    accountId,
    gymId,
    name,
    scopes,
  });

  const client = await prisma.oAuthClient.findUniqueOrThrow({
    where: { clientId: created.clientId },
  });

  const token = await issueClientCredentialsToken(
    client,
    undefined,
    resolveMcpTokenTtlSeconds(),
  );

  return {
    clientId: created.clientId,
    clientSecret: created.clientSecret,
    scopes: created.scopes,
    accessToken: token.access_token,
    expiresIn: token.expires_in,
    scope: token.scope,
    readOnly,
  };
}

export async function mintAgentAccessToken(clientId: string, gymId: string) {
  const client = await prisma.oAuthClient.findFirst({
    where: {
      clientId,
      gymId,
      type: "AGENT",
      isActive: true,
      revokedAt: null,
    },
  });
  if (!client) return null;
  return issueClientCredentialsToken(
    client,
    undefined,
    resolveMcpTokenTtlSeconds(),
  );
}

export async function buildConnectBundleForClient(
  clientId: string,
  gymId: string,
  appUrl: string,
) {
  const token = await mintAgentAccessToken(clientId, gymId);
  if (!token) return null;
  return buildMcpConnectPayload(appUrl, token.access_token, token.expires_in);
}

export async function testAgentClientConnection(clientId: string, gymId: string) {
  const client = await prisma.oAuthClient.findFirst({
    where: {
      clientId,
      gymId,
      type: "AGENT",
      isActive: true,
      revokedAt: null,
    },
  });
  if (!client) return { ok: false as const, error: "Agent not found or revoked" };

  ensureToolRegistry();
  try {
    const result = await executeTool(
      "searchMembers",
      { limit: 1 },
      {
        gymId,
        agentScopes: client.scopes,
        userId: `agent:${client.clientId}`,
      },
    );
    return {
      ok: true as const,
      tool: "searchMembers",
      message: "Connection OK — gym data is reachable from your assistant.",
      sample: result,
    };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Tool call failed",
    };
  }
}

export async function revokeAgentClient(clientId: string, gymId: string) {
  const result = await prisma.oAuthClient.updateMany({
    where: { clientId, gymId, type: "AGENT", revokedAt: null },
    data: { isActive: false, revokedAt: new Date() },
  });
  return result.count > 0;
}

export function resolvePublicAppUrl(requestUrl?: string): string {
  const fromEnv = process.env.NEXTAUTH_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (requestUrl) return new URL(requestUrl).origin;
  return "http://127.0.0.1:3000";
}

export { buildCursorMcpConfig as buildRemoteMcpCursorConfig } from "@/lib/oauth/mcp-connect";
