import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";
import { getTrainerLeaderboard } from "@/domains/trainers/leaderboard";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api-trainer-leaderboard");

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

    const days = parseInt(request.nextUrl.searchParams.get("days") ?? "90", 10);
    const board = await getTrainerLeaderboard(
      gymId,
      Number.isNaN(days) ? 90 : days,
    );
    return NextResponse.json(board);
  } catch (error) {
    logger.error("Trainer leaderboard failed", error as Error);
    return ApiErrors.internal("Failed to load trainer leaderboard");
  }
}
