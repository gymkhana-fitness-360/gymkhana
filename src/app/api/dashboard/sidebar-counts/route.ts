import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { createLogger } from "@/lib/logger";
import { ApiErrors } from "@/lib/api-handler";
import { sidebarCountsHandler } from "@/domains/analytics/handlers/sidebar-counts";

const logger = createLogger("api-sidebar-counts");

/**
 * Lightweight aggregate counts for the sidebar. Replaces the previous approach of
 * fetching `/api/members|payments|attendance?limit=1000` and counting client-side.
 */
export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  try {
    return await sidebarCountsHandler(request);
  } catch (error) {
    logger.error("Error fetching sidebar counts:", error as Error);
    return ApiErrors.internal("Failed to fetch sidebar counts");
  }
}
