import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";
import { getMemberInsights } from "@/domains/members/member-insights";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api-member-insights");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session?.user?.id) return ApiErrors.unauthorized();

    const gymId = await resolveGymIdForUser(
      session.user.id,
      readRequestedGymIdFromRequest(request),
    );
    if (!gymId) {
      return ApiErrors.badRequest("No gym selected or account has no locations.");
    }

    const { id } = await params;
    const insights = await getMemberInsights(gymId, id);
    if (!insights) return ApiErrors.notFound("Member");

    return NextResponse.json(insights);
  } catch (error) {
    logger.error("Member insights failed", error as Error);
    return ApiErrors.internal("Failed to load member insights");
  }
}
