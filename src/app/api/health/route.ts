import { NextRequest } from "next/server";

import { z } from "zod";
import { parseJsonBody } from "@/lib/security/parse-json-body";

const mutatingBodySchema = z.object({
  errorType: z.string().optional(),
  errorMessage: z.string().optional(),
}).passthrough();
import { ErrorMonitor } from "@/lib/error-monitor";
import { prisma } from "@/lib/prisma";
import { ApiErrors } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { inngest } from "@/inngest/client";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { createLogger } from "@/lib/logger";
import { auth } from "@/lib/auth";

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

  // Check database
  let databaseHealthy = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseHealthy = true;
  } catch (error) {
    logger.error("Database health check failed:", error as Error);
  }

  // Basic health response (public - for load balancers/monitoring)
  const basicResponse = {
    status: databaseHealthy ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    services: {
      database: databaseHealthy ? "healthy" : "unhealthy",
    },
  };

  // Check if user is admin for detailed stats
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    // Return basic health only for non-admins
    return successResponse(basicResponse);
  }

  // Admin gets full details including error monitoring
  const monitor = ErrorMonitor.getInstance();
  const stats = monitor.getStats();
  const errorLog = monitor.getErrorLog();

  return successResponse({
    ...basicResponse,
    services: {
      ...basicResponse.services,
      inngest: "healthy",
      errorMonitor: "active",
    },
    errorMonitor: {
      stats,
      recentErrors: errorLog.slice(-10),
    },
  });
}

/**
 * POST /api/health/fix
 * Manually trigger error fix (Admin only)
 */
export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  try {
    // Require admin authentication
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }
    if (session.user.role !== "ADMIN") {
      return ApiErrors.forbidden("Admin access required");
    }

    const parsedBody = await parseJsonBody(request, mutatingBodySchema);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.data as any;
    const { errorType, errorMessage } = body;

    // Trigger auto-fix via Inngest
    await inngest.send({
      name: "error/build.detected",
      data: {
        errorType: errorType || "manual",
        errorMessage: errorMessage || "Manual fix triggered",
      },
    });

    return successResponse({
      message: "Fix job triggered",
    });
  } catch (error: unknown) {
    logger.error("Health fix error:", error instanceof Error ? error : undefined);
    return ApiErrors.internal("Failed to trigger fix");
  }
}
