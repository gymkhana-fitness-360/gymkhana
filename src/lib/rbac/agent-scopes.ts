import { z } from "zod";

/** Agent OAuth scopes — separate from dashboard Permission strings. */
export const AGENT_SCOPES = [
  "read:health",
  "read:overdue",
  "read:members",
  "read:payments",
  "read:analytics",
  "write:reminders",
] as const;

export type AgentScope = (typeof AGENT_SCOPES)[number];

export const agentScopeSchema = z.enum(AGENT_SCOPES);

export const AGENT_SCOPE_SET = new Set<string>(AGENT_SCOPES);

export function parseAgentScopes(scopes: string[]): AgentScope[] {
  return scopes.filter((s): s is AgentScope => AGENT_SCOPE_SET.has(s));
}

export function agentHasScope(granted: string[], required: AgentScope): boolean {
  return granted.includes(required);
}

export function agentHasAnyScope(granted: string[], required: AgentScope[]): boolean {
  return required.some((s) => granted.includes(s));
}

/** Default scopes for new AGENT clients (read-only v1). */
export const DEFAULT_AGENT_CLIENT_SCOPES: AgentScope[] = [
  "read:health",
  "read:overdue",
  "read:members",
  "read:payments",
  "read:analytics",
];

/** ACCOUNT integration clients — broader read across gyms with explicit gym header. */
export const DEFAULT_ACCOUNT_CLIENT_SCOPES: AgentScope[] = [
  "read:members",
  "read:payments",
  "read:analytics",
  "read:overdue",
];

export function normalizeRequestedScopes(
  requested: string[] | undefined,
  allowed: string[],
): string[] {
  if (!requested?.length) return allowed;
  const allowedSet = new Set(allowed);
  const picked = requested.filter((s) => allowedSet.has(s));
  return picked.length > 0 ? picked : allowed;
}
