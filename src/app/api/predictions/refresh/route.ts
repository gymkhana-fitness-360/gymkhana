import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";
import { generateOpportunitiesForGym } from "@/domains/revenue-opportunities/service";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api-predictions-refresh");

/** Recompute opportunities + churn snapshots for the active gym (admin only). */
export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "inferenceRefresh");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session?.user?.id) return ApiErrors.unauthorized();
    if (session.user.role !== "ADMIN") {
      return ApiErrors.forbidden("Only gym admins can recompute AI readiness.");
    }

    const gymId = await resolveGymIdForUser(
      session.user.id,
      readRequestedGymIdFromRequest(request),
    );
    if (!gymId) {
      return ApiErrors.badRequest("No gym selected or account has no locations.");
    }

    const result = await generateOpportunitiesForGym(gymId);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    logger.error("Failed to refresh predictions", error as Error);
    return ApiErrors.internal("Failed to refresh predictions");
  }
}
