import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ApiErrors } from "@/lib/api-handler";
import { requireApiGymId } from "@/lib/api/gym-context";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { buildMcpConnectPayload } from "@/lib/oauth/mcp-connect";
import {
  mintAgentAccessToken,
  resolvePublicAppUrl,
} from "@/lib/oauth/agent-clients-service";
import { logAction } from "@/lib/audit-logger";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const limited = withRateLimit(request, "strict");
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();
  if (session.user.role !== "ADMIN") return ApiErrors.forbidden("Admin access required");

  const gymId = await requireApiGymId(session, request);
  if (gymId instanceof NextResponse) return gymId;

  const { clientId } = await params;
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
