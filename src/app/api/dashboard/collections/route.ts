import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { createLogger } from "@/lib/logger";
import { ApiErrors } from "@/lib/api-handler";
import { dashboardCollectionsHandler } from "@/domains/analytics/handlers/dashboard-collections";

const logger = createLogger("api-dashboard");

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;
  try {
    return await dashboardCollectionsHandler(request);
  } catch (error) {
    logger.error("Error fetching collection stats:", error as Error);
    return ApiErrors.internal("Failed to fetch collection stats");
  }
}
