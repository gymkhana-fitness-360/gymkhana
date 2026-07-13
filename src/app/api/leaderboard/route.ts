import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { createLogger } from "@/lib/logger";
import { ApiErrors } from "@/lib/api-handler";
import { leaderboardHandler } from "@/domains/engagement/handlers/leaderboard";

const logger = createLogger("api-leaderboard");

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  try {
    return await leaderboardHandler(request);
  } catch (error) {
    logger.error("Error fetching leaderboard:", error as Error);
    return ApiErrors.internal("Failed to fetch leaderboard");
  }
}
