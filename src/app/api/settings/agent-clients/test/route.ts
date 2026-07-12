import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { ApiErrors } from "@/lib/api-handler";
import { requireApiGymId } from "@/lib/api/gym-context";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { testAgentClientConnection } from "@/lib/oauth/agent-clients-service";

const bodySchema = z.object({
  clientId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const limited = withRateLimit(request, "moderate");
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();
  if (session.user.role !== "ADMIN") return ApiErrors.forbidden("Admin access required");

  const gymId = await requireApiGymId(session, request);
  if (gymId instanceof NextResponse) return gymId;

  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return parsed.response;

  const result = await testAgentClientConnection(parsed.data.clientId, gymId);
  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true, ...result });
}
