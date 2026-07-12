import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { resolveOAuthPrincipal } from "@/lib/auth/resolve-request-auth";
import {
  requireAgentScopeOrThrow,
  AgentScopeError,
} from "@/lib/rbac/enforce";
import type { AgentScope } from "@/lib/rbac/agent-scopes";
import type { OAuthAuthPrincipal } from "@/lib/rbac/types";

export type AgentAuthResult =
  | { ok: true; principal: OAuthAuthPrincipal; gymId: string }
  | { ok: false; response: NextResponse };

export async function requireAgentAuth(
  request: NextRequest,
  scope: AgentScope,
): Promise<AgentAuthResult> {
  const principal = await resolveOAuthPrincipal(request);
  if (!principal) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "invalid_token", error_description: "Bearer agent token required" },
        { status: 401 },
      ),
    };
  }

  if (principal.kind !== "agent_oauth") {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "invalid_token",
          error_description: "Agent tools require an AGENT OAuth client token",
        },
        { status: 403 },
      ),
    };
  }

  try {
    requireAgentScopeOrThrow(principal, scope);
  } catch (e) {
    if (e instanceof AgentScopeError) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "insufficient_scope", error_description: e.message },
          { status: 403 },
        ),
      };
    }
    throw e;
  }

  if (!principal.gymId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "invalid_token", error_description: "Agent token missing gym binding" },
        { status: 403 },
      ),
    };
  }

  return { ok: true, principal, gymId: principal.gymId };
}
