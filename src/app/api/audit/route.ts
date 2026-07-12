import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cachedJson } from "@/lib/api-cache";
import { prisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { createLogger } from "@/lib/logger";
import { ApiErrors } from "@/lib/api-handler";

const logger = createLogger("api-audit");

/**
 * GET /api/audit
 * Fetch action logs for signed-in user. Admin sees all.
 */
export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 500);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const action = searchParams.get("action");

    const where: { userId?: string; action?: string } = {};
    if (session.user.role !== "ADMIN") {
      where.userId = session.user.id;
    }
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          User: { select: { name: true, contactNumber: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return cachedJson({ logs, total });
  } catch (error) {
    logger.error("[GET /api/audit]", error as Error);
    return ApiErrors.internal("Failed to fetch logs");
  }
}
