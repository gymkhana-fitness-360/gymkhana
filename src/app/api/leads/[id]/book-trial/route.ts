import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { getGymContext, GymContextError } from "@/domains/tenancy";
import { convertLeadToTrial } from "@/domains/leads/service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = withRateLimit(request, "moderate");
  if (rl) return rl;

  try {
    const { gymId, userId } = await getGymContext(request);
    const session = await auth();
    if (!session?.user?.id) return ApiErrors.unauthorized();

    const { id } = await params;
    const result = await convertLeadToTrial(gymId, id, userId);
    if (!result) return ApiErrors.notFound("Lead");

    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    return ApiErrors.internal("Failed to book trial");
  }
}
