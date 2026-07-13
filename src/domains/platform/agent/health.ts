import { NextRequest, NextResponse } from "next/server";
import { requireAgentAuth } from "@/lib/agent/require-agent-auth";

/** GYM-AI-002: agent gateway health (OAuth bearer, read-only). */
export async function agentHealthHandler(request: NextRequest) {
  const auth = await requireAgentAuth(request, "read:health");
  if (!auth.ok) return auth.response;

  return NextResponse.json({
    status: "ok",
    version: "v1",
    gymId: auth.gymId,
    capabilities: ["health"],
  });
}
