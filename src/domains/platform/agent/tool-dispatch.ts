import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAgentAuth } from "@/lib/agent/require-agent-auth";
import {
  ensureToolRegistry,
  executeTool,
  getTool,
  ToolExecutionError,
} from "@/platform/tools/registry";
import type { AgentScope } from "@/lib/rbac/agent-scopes";
import { parseJsonBody } from "@/lib/security/parse-json-body";

const bodySchema = z.record(z.string(), z.unknown()).optional();

const TOOL_SCOPES: Record<string, AgentScope[]> = {
  searchMembers: ["read:members"],
  getOverdues: ["read:overdue"],
  listChaseCandidates: ["read:analytics"],
  getChasePlan: ["read:analytics"],
  getAttendanceHeatmap: ["read:analytics"],
  listActiveTrials: ["read:members"],
  getTrainerLeaderboard: ["read:analytics"],
  getMemberInsights: ["read:members"],
  getPaymentTimingInsights: ["read:payments"],
  listOffers: ["read:analytics"],
  createOffer: ["write:reminders"],
  draftEngagement: ["write:reminders"],
  sendReminder: ["write:reminders"],
  getRenewals: ["read:analytics"],
  convertTrialToMember: ["write:reminders"],
  createMembership: ["write:reminders"],
  cancelMembership: ["write:reminders"],
  getOperatingHoursFact: ["read:analytics"],
  recommendProducts: ["read:analytics"],
  listLeads: ["read:members"],
  createLead: ["write:reminders"],
  updateLead: ["write:reminders"],
  convertLeadToTrial: ["write:reminders"],
  listLeadsDueForFollowUp: ["read:members"],
  listGymFacts: ["read:analytics"],
  createCampaign: ["write:reminders"],
  getTrainerPerformance: ["read:analytics"],
  applyPtDiscount: ["write:reminders"],
  createPtRevenueGoal: ["write:reminders"],
  suggestPaymentOptions: ["read:payments"],
  createOrderLine: ["write:reminders"],
  supplementRepurchaseNudge: ["read:analytics"],
};

function hasBearer(request: NextRequest): boolean {
  const h = request.headers.get("authorization");
  return !!h?.toLowerCase().startsWith("bearer ");
}

export async function dispatchAgentToolHandler(
  request: NextRequest,
  name: string,
) {
  ensureToolRegistry();

  const tool = getTool(name);
  if (!tool) {
    return NextResponse.json({ error: "unknown_tool", tool: name }, { status: 404 });
  }

  const requiredScopes = TOOL_SCOPES[name] ?? tool.agentScopes;
  const scope = requiredScopes[0];
  if (!scope) {
    return NextResponse.json({ error: "tool_misconfigured" }, { status: 500 });
  }

  if (!hasBearer(request)) {
    return NextResponse.json(
      { error: "invalid_token", error_description: "Bearer agent token required" },
      { status: 401 },
    );
  }

  const agentAuth = await requireAgentAuth(request, scope);
  if (!agentAuth.ok) return agentAuth.response;

  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return parsed.response;

  try {
    const result = await executeTool(name, parsed.data ?? {}, {
      gymId: agentAuth.gymId,
      agentScopes: agentAuth.principal.scopes,
      userId: `agent:${agentAuth.principal.clientId}`,
    });
    return NextResponse.json({ tool: name, result });
  } catch (e) {
    if (e instanceof ToolExecutionError) {
      return NextResponse.json(
        { error: e.code, message: e.message },
        { status: e.code === "insufficient_scope" ? 403 : 400 },
      );
    }
    throw e;
  }
}
