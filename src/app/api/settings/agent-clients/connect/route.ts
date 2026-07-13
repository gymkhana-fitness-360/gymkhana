import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { connectAgentClientHandler } from "@/domains/platform/settings/agent-clients";

export async function POST(request: NextRequest) {
  const limited = withRateLimit(request, "moderate");
  if (limited) return limited;
  return connectAgentClientHandler(request);
}
