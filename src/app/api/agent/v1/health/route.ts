import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { agentHealthHandler } from "@/domains/platform/agent/health";

/** GYM-AI-002: agent gateway health (OAuth bearer, read-only). */
export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;
  return agentHealthHandler(request);
}
