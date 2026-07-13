import { NextRequest } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { ErrorMonitor } from "@/lib/error-monitor";
import { prisma } from "@/lib/prisma";
import { ApiErrors } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { inngest } from "@/inngest/client";
import { createLogger } from "@/lib/logger";
import { auth } from "@/lib/auth";

const logger = createLogger("health");

const mutatingBodySchema = z
  .object({
    errorType: z.string().optional(),
    errorMessage: z.string().optional(),
  })
  .passthrough();

/**
 * Health check endpoint.
 * Basic health (database status) is public for load balancers.
 * Error monitoring details require admin auth.
 */
export async function healthCheckHandler(request: NextRequest) {
  let databaseHealthy = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseHealthy = true;
  } catch (error) {
    logger.error("Database health check failed:", error as Error);
  }

  const basicResponse = {
    status: databaseHealthy ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    services: {
      database: databaseHealthy ? "healthy" : "unhealthy",
    },
  };

  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return successResponse(basicResponse);
  }

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

/** Manually trigger error fix (Admin only). */
export async function healthFixHandler(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }
    if (session.user.role !== "ADMIN") {
      return ApiErrors.forbidden("Admin access required");
    }

    const parsedBody = await parseJsonBody(request, mutatingBodySchema);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.data as Record<string, unknown>;
    const { errorType, errorMessage } = body;

    await inngest.send({
      name: "error/build.detected",
      data: {
        errorType: String(errorType ?? "manual"),
        errorMessage: String(errorMessage ?? "Manual fix triggered"),
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
