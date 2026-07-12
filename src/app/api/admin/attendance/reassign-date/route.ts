import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { ApiErrors } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { requireApiGymId } from "@/lib/api/gym-context";
import { createLogger } from "@/lib/logger";
import { reassignAttendanceDate } from "@/domains/admin-repair";

const logger = createLogger("api-admin-attendance-reassign");

const schema = z.object({
  attendanceIds: z.array(z.string().min(1)).min(1),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session?.user?.id) return ApiErrors.unauthorized();
    if (session.user.role !== "ADMIN") return ApiErrors.forbidden("Admin access required");

    const gymId = await requireApiGymId(session, request);
    if (gymId instanceof Response) return gymId;

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return ApiErrors.validationError("Invalid input", parsed.error.issues);
    }

    const outcome = await reassignAttendanceDate({
      gymId,
      attendanceIds: parsed.data.attendanceIds,
      targetDateYmd: parsed.data.targetDate,
      adminUserId: session.user.id,
    });

    return successResponse({
      succeeded: outcome.succeeded,
      failed: outcome.failed,
      results: outcome.results,
      sourceDates: outcome.sourceDates,
      targetDate: parsed.data.targetDate,
    });
  } catch (error) {
    logger.error("attendance reassign-date", error as Error);
    return ApiErrors.internal("Failed to reassign attendance dates");
  }
}
