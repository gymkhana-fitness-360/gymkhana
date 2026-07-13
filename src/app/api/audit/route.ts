import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cachedJson } from "@/lib/api-cache";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { createLogger } from "@/lib/logger";
import { ApiErrors } from "@/lib/api-handler";
import { requireApiGymId } from "@/lib/api/gym-context";
import { listAuditLogs } from "@/domains/platform/audit/queries";

const logger = createLogger("api-audit");

/**
 * GET /api/audit
 * Fetch action logs for the active gym.
 */
export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const gymId = await requireApiGymId(session, request);
    if (gymId instanceof NextResponse) return gymId;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 500);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const action = searchParams.get("action") ?? undefined;

    const result = await listAuditLogs({
      gymId,
      userId: session.user.role !== "ADMIN" ? session.user.id : undefined,
      action,
      limit,
      offset,
    });

    return cachedJson(result);
  } catch (error) {
    logger.error("[GET /api/audit]", error as Error);
    return ApiErrors.internal("Failed to fetch logs");
  }
}
