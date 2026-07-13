import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { ApiErrors } from "@/lib/api-handler";
import { requireApiGymId } from "@/lib/api/gym-context";
import { resolveAccountIdForRequest } from "@/lib/account-user-scope";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { buildMcpConnectPayload } from "@/lib/oauth/mcp-connect";
import {
  buildConnectBundleForClient,
  createAgentClientForGym,
  listAgentClientsForGym,
  mintAgentAccessToken,
  resolvePublicAppUrl,
  revokeAgentClient,
  testAgentClientConnection,
} from "@/lib/oauth/agent-clients-service";
import { logAction } from "@/lib/audit-logger";

const createSchema = z.object({
  name: z.string().min(1).max(80),
  readOnly: z.boolean().optional(),
});

const clientIdBodySchema = z.object({
  clientId: z.string().min(1),
});

export async function listAgentClientsHandler(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();
  if (session.user.role !== "ADMIN") return ApiErrors.forbidden("Admin access required");

  const gymId = await requireApiGymId(session, request);
  if (gymId instanceof NextResponse) return gymId;

  const clients = await listAgentClientsForGym(gymId);
  const appUrl = resolvePublicAppUrl(request.url);

  return NextResponse.json({
    appUrl,
    mcpUrl: `${appUrl}/api/mcp`,
    clients: clients.map((c) => ({
      clientId: c.clientId,
      name: c.name,
      scopes: c.scopes,
      isActive: c.isActive && !c.revokedAt,
      createdAt: c.createdAt.toISOString(),
    })),
  });
}

export async function createAgentClientHandler(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();
  if (session.user.role !== "ADMIN") return ApiErrors.forbidden("Admin access required");

  const gymId = await requireApiGymId(session, request);
  if (gymId instanceof NextResponse) return gymId;

  const accountId = await resolveAccountIdForRequest(session.user.id, request);
  if (!accountId) {
    return ApiErrors.badRequest("No account context for this user.");
  }

  const parsed = await parseJsonBody(request, createSchema);
  if (!parsed.ok) return parsed.response;

  const created = await createAgentClientForGym(
    accountId,
    gymId,
    parsed.data.name,
    { readOnly: parsed.data.readOnly },
  );

  await logAction(session.user.id, "agent_client_created", "OAuthClient", created.clientId, {
    gymId,
    readOnly: created.readOnly,
    scopes: created.scopes,
  });

  const appUrl = resolvePublicAppUrl(request.url);
  const connect = buildMcpConnectPayload(
    appUrl,
    created.accessToken,
    created.expiresIn,
  );

  return NextResponse.json({
    ...created,
    connect,
    hint: "Save the client secret if you use automations (Zapier). For Cursor/Claude, use Download config — token auto-refreshes from this page for 7 days.",
  });
}

export async function revokeAgentClientHandler(
  request: NextRequest,
  clientId: string,
) {
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();
  if (session.user.role !== "ADMIN") return ApiErrors.forbidden("Admin access required");

  const gymId = await requireApiGymId(session, request);
  if (gymId instanceof NextResponse) return gymId;

  const ok = await revokeAgentClient(clientId, gymId);
  if (!ok) return ApiErrors.notFound("Agent client not found");

  return NextResponse.json({ success: true });
}

export async function mintAgentClientTokenHandler(
  request: NextRequest,
  clientId: string,
) {
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();
  if (session.user.role !== "ADMIN") return ApiErrors.forbidden("Admin access required");

  const gymId = await requireApiGymId(session, request);
  if (gymId instanceof NextResponse) return gymId;

  const token = await mintAgentAccessToken(clientId, gymId);
  if (!token) return ApiErrors.notFound("Agent client not found or revoked");

  await logAction(session.user.id, "agent_token_issued", "OAuthClient", clientId, {
    gymId,
    scope: token.scope,
  });

  const appUrl = resolvePublicAppUrl(request.url);
  const connect = buildMcpConnectPayload(
    appUrl,
    token.access_token,
    token.expires_in,
  );

  return NextResponse.json({
    accessToken: token.access_token,
    expiresIn: token.expires_in,
    scope: token.scope,
    connect,
  });
}

/** Mint a fresh MCP token + download configs (admin session — no secret required). */
export async function connectAgentClientHandler(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();
  if (session.user.role !== "ADMIN") return ApiErrors.forbidden("Admin access required");

  const gymId = await requireApiGymId(session, request);
  if (gymId instanceof NextResponse) return gymId;

  const parsed = await parseJsonBody(request, clientIdBodySchema);
  if (!parsed.ok) return parsed.response;

  const appUrl = resolvePublicAppUrl(request.url);
  const connect = await buildConnectBundleForClient(
    parsed.data.clientId,
    gymId,
    appUrl,
  );
  if (!connect) return ApiErrors.notFound("Agent client not found");

  return NextResponse.json({ success: true, connect });
}

export async function testAgentClientHandler(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();
  if (session.user.role !== "ADMIN") return ApiErrors.forbidden("Admin access required");

  const gymId = await requireApiGymId(session, request);
  if (gymId instanceof NextResponse) return gymId;

  const parsed = await parseJsonBody(request, clientIdBodySchema);
  if (!parsed.ok) return parsed.response;

  const result = await testAgentClientConnection(parsed.data.clientId, gymId);
  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true, ...result });
}
