import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { createLogger } from "@/lib/logger";
import { ApiErrors } from "@/lib/api-handler";
import {
  healthCheckHandler,
  healthFixHandler,
} from "@/domains/platform/handlers/health";

const logger = createLogger("api-health");

/**
 * GET /api/health
 * Health check endpoint.
 * Basic health (database status) is public for load balancers.
 * Error monitoring details require admin auth.
 */
export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;
  return healthCheckHandler(request);
}

/**
 * POST /api/health/fix
 * Manually trigger error fix (Admin only)
 */
export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  try {
    return await healthFixHandler(request);
  } catch (error: unknown) {
    logger.error("Health fix error:", error instanceof Error ? error : undefined);
    return ApiErrors.internal("Failed to trigger fix");
  }
}
