/** GYM-AI-005: AI feature flags and cost guardrails */
export function isAiEnabled(): boolean {
  return process.env.AI_FEATURES_ENABLED === "true";
}

export function maxAgentRequestsPerHour(): number {
  const n = Number(process.env.AI_MAX_REQUESTS_PER_HOUR ?? "60");
  return Number.isFinite(n) && n > 0 ? n : 60;
}
