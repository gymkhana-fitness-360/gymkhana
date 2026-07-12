import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { noStoreJson } from "@/lib/api-cache";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { requireApiGymId } from "@/lib/api/gym-context";
import { prisma } from "@/lib/prisma";
import { requirePermission, PermissionError } from "@/lib/permissions";
import { getAttendanceCallList } from "@/domains/analytics/daily-stats.service";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api-attendance-call-list");

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session?.user) return ApiErrors.unauthorized();

    try {
      requirePermission(session, "canViewMembers");
    } catch (error) {
      if (error instanceof PermissionError) return ApiErrors.forbidden();
      throw error;
    }

    const gymId = await requireApiGymId(session, request);
    if (gymId instanceof Response) return gymId;

    const data = await getAttendanceCallList(prisma, gymId);
    return noStoreJson({ success: true, data });
  } catch (error) {
    logger.error("attendance call list", error as Error);
    return ApiErrors.internal("Failed to load call list");
  }
}
