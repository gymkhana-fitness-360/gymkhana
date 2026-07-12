import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { noStoreJson } from "@/lib/api-cache";
import { ApiErrors } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { requireApiGymId } from "@/lib/api/gym-context";
import { prisma } from "@/lib/prisma";
import { requirePermission, PermissionError } from "@/lib/permissions";
import { todayIST } from "@/lib/date-only";
import { isoDateOnlyString } from "@/lib/gym-operational-days";
import {
  loadAttendanceBootstrap,
  loadAttendanceBootstrapCritical,
  loadAttendanceBootstrapRecords,
} from "@/domains/attendance/services/bootstrap";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api-attendance-bootstrap");

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

    const scope = request.nextUrl.searchParams.get("scope") ?? "full";

    if (scope === "records") {
      const data = await loadAttendanceBootstrapRecords(prisma, gymId, dateYmd);
      return noStoreJson({ success: true, data });
    }
    if (scope === "critical") {
      const data = await loadAttendanceBootstrapCritical(prisma, gymId, dateYmd);
      return noStoreJson({ success: true, data });
    }

    const data = await loadAttendanceBootstrap(prisma, gymId, dateYmd);
    return noStoreJson({ success: true, data });
  } catch (error) {
    logger.error("attendance bootstrap", error as Error);
    return ApiErrors.internal("Failed to load attendance page data");
  }
}
