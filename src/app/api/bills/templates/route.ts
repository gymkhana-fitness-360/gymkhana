import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api-bills");

/**
 * GET /api/bills/templates
 * Get all active bill templates.
 */
export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session) {
      return ApiErrors.unauthorized();
    }

    const templates = await prisma.receiptTemplate.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        { type: "asc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ templates });
  } catch (error) {
    logger.error("[GET /api/bills/templates]", error as Error);
    return ApiErrors.internal("Failed to fetch templates");
  }
}
