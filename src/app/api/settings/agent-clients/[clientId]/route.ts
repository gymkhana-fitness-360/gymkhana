import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ApiErrors } from "@/lib/api-handler";
import { requireApiGymId } from "@/lib/api/gym-context";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { revokeAgentClient } from "@/lib/oauth/agent-clients-service";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const limited = withRateLimit(request, "moderate");
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();
  if (session.user.role !== "ADMIN") return ApiErrors.forbidden("Admin access required");

  const gymId = await requireApiGymId(session, request);
  if (gymId instanceof NextResponse) return gymId;

  const { clientId } = await params;
  const ok = await revokeAgentClient(clientId, gymId);
  if (!ok) return ApiErrors.notFound("Agent client not found");

  return NextResponse.json({ success: true });
}
