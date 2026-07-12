import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listOverdueForGymId, listOverdueMembersResponse } from "@/domains/collections/handlers/list-overdue";
import { requireAgentAuth } from "@/lib/agent/require-agent-auth";

/**
 * GYM-AI-001: read-only overdue tool.
 * AGENT OAuth Bearer (scope read:overdue) or legacy session for dashboard.
 */
function hasBearer(request: NextRequest): boolean {
  const h = request.headers.get("authorization");
  return !!h?.toLowerCase().startsWith("bearer ");
}

export async function GET(request: NextRequest) {
  if (hasBearer(request)) {
    const agentAuth = await requireAgentAuth(request, "read:overdue");
    if (!agentAuth.ok) return agentAuth.response;
    return listOverdueForGymId(agentAuth.gymId);
  }

  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return listOverdueMembersResponse(session, request);
}
