import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import {
  createAgentClientHandler,
  listAgentClientsHandler,
} from "@/domains/platform/settings/agent-clients";

export async function GET(request: NextRequest) {
  const limited = withRateLimit(request, "lenient");
  if (limited) return limited;
  return listAgentClientsHandler(request);
}

export async function POST(request: NextRequest) {
  const limited = withRateLimit(request, "moderate");
  if (limited) return limited;
  return createAgentClientHandler(request);
}
