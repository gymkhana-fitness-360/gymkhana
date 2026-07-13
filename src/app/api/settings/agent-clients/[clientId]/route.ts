import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { revokeAgentClientHandler } from "@/domains/platform/settings/agent-clients";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const limited = withRateLimit(request, "moderate");
  if (limited) return limited;

  const { clientId } = await params;
  return revokeAgentClientHandler(request, clientId);
}
