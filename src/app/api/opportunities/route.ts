import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";
import {
  getOpportunitySummary,
  listOpportunities,
} from "@/domains/revenue-opportunities";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api-opportunities");

export async function GET(request: NextRequest) {
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

    const status = request.nextUrl.searchParams.get("status") ?? undefined;
    const limit = parseInt(request.nextUrl.searchParams.get("limit") ?? "50", 10);

    const [opportunities, summary] = await Promise.all([
      listOpportunities(gymId, {
        status: status as "OPEN" | "CONTACTED" | "RECOVERED" | "LOST" | undefined,
        limit: Number.isNaN(limit) ? 50 : limit,
      }),
      getOpportunitySummary(gymId),
    ]);

    return NextResponse.json({ opportunities, summary });
  } catch (error) {
    logger.error("Failed to list opportunities", error as Error);
    return ApiErrors.internal("Failed to list opportunities");
  }
}
