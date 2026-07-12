import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { ApiErrors } from "@/lib/api-handler";
import { requireApiGymId } from "@/lib/api/gym-context";
import { resolveAccountIdForRequest } from "@/lib/account-user-scope";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { buildMcpConnectPayload } from "@/lib/oauth/mcp-connect";
import {
  createAgentClientForGym,
  listAgentClientsForGym,
  resolvePublicAppUrl,
} from "@/lib/oauth/agent-clients-service";
import { logAction } from "@/lib/audit-logger";

const createSchema = z.object({
  name: z.string().min(1).max(80),
  readOnly: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const limited = withRateLimit(request, "lenient");
  if (limited) return limited;

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

export async function POST(request: NextRequest) {
  const limited = withRateLimit(request, "moderate");
  if (limited) return limited;

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
