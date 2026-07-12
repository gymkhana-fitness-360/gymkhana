import type { Session } from "next-auth";
import type { Permission } from "@/lib/permissions";
import { PermissionError } from "@/lib/permissions";
import { accountRoleHasPermission } from "@/lib/rbac/account-roles";
import type { EffectivePermissionContext } from "@/lib/rbac/types";
import {
  agentHasScope,
  type AgentScope,
} from "@/lib/rbac/agent-scopes";
import type { AuthPrincipal, OAuthAuthPrincipal } from "@/lib/rbac/types";

export function buildSessionPermissionContext(
  session: Session,
  accountMemberRole: EffectivePermissionContext["accountMemberRole"],
): EffectivePermissionContext {
  return {
    accountMemberRole,
    userRole: session.user.role,
  };
}

export function requireSessionPermission(
  session: Session,
  permission: Permission,
  accountMemberRole: EffectivePermissionContext["accountMemberRole"],
): void {
  const ctx = buildSessionPermissionContext(session, accountMemberRole);
  if (!accountRoleHasPermission(ctx, permission)) {
    throw new PermissionError(permission);
  }
}

export class AgentScopeError extends Error {
  constructor(scope: AgentScope) {
    super(`Agent scope denied: ${scope}`);
    this.name = "AgentScopeError";
  }
}

export function requireAgentScopeOrThrow(
  principal: OAuthAuthPrincipal,
  scope: AgentScope,
): void {
  if (!agentHasScope(principal.scopes, scope)) {
    throw new AgentScopeError(scope);
  }
}

export function assertPrincipalKind(
  principal: AuthPrincipal,
  kind: AuthPrincipal["kind"],
): void {
  if (principal.kind !== kind) {
    throw new Error(`Expected auth kind ${kind}, got ${principal.kind}`);
  }
}
