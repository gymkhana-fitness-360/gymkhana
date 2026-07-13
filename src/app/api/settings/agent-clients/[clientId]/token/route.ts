import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { mintAgentClientTokenHandler } from "@/domains/platform/settings/agent-clients";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const limited = withRateLimit(request, "strict");
  if (limited) return limited;

  const { clientId } = await params;
  return mintAgentClientTokenHandler(request, clientId);
}
