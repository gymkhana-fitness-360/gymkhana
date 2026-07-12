import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";
import { buildAttendanceHeatmap } from "@/domains/analytics/attendance-heatmap";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api-attendance-heatmap");

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

    const days = parseInt(request.nextUrl.searchParams.get("days") ?? "28", 10);
    const heatmap = await buildAttendanceHeatmap(
      gymId,
      Number.isNaN(days) ? 28 : Math.min(90, Math.max(7, days)),
    );

    return NextResponse.json(heatmap);
  } catch (error) {
    logger.error("Heatmap failed", error as Error);
    return ApiErrors.internal("Failed to build attendance heatmap");
  }
}
