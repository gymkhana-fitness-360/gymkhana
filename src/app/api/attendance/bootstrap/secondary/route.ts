import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { noStoreJson } from "@/lib/api-cache";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { requireApiGymId } from "@/lib/api/gym-context";
import { prisma } from "@/lib/prisma";
import { requirePermission, PermissionError } from "@/lib/permissions";
import { todayIST } from "@/lib/date-only";
import { isoDateOnlyString } from "@/lib/gym-operational-days";
import { loadAttendanceBootstrapRecords } from "@/domains/attendance/services/bootstrap";
import { getAttendanceCallList } from "@/domains/analytics/daily-stats.service";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api-attendance-bootstrap-secondary");

/** Secondary attendance payload — records + call list (lighter follow-up fetch). */
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

    const dateParam = request.nextUrl.searchParams.get("date");
    const dateYmd = dateParam?.match(/^\d{4}-\d{2}-\d{2}$/)
      ? dateParam
      : isoDateOnlyString(todayIST());

    const [records, callList] = await Promise.all([
      loadAttendanceBootstrapRecords(prisma, gymId, dateYmd),
      getAttendanceCallList(prisma, gymId),
    ]);

    return noStoreJson({ success: true, data: { ...records, callList } });
  } catch (error) {
    logger.error("attendance bootstrap secondary", error as Error);
    return ApiErrors.internal("Failed to load secondary attendance data");
  }
}
