import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { createLogger } from "@/lib/logger";
import { ApiErrors, successResponse } from "@/lib/api-response";
import { requirePermission, PermissionError } from "@/lib/permissions";
import { createWalkInVisitSchema, walkInVisitQuerySchema } from "@/lib/validators";
import { BusinessRuleViolation } from "@/lib/crud-business-validation";
import {
  createWalkInVisit,
  getWalkInPhoneSummary,
  listWalkInVisitsForDate,
} from "@/domains/attendance/services/walk-in-visit.service";
import { getGymContext, GymContextError } from "@/domains/tenancy";
import { todayIST } from "@/lib/date-only";

const logger = createLogger("api-free-trial-visits");

function todayYmd(): string {
  return todayIST().toISOString().slice(0, 10);
}

export async function getWalkInVisitsHandler(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return ApiErrors.unauthorized();
    requirePermission(session, "canViewMembers");

    const { gymId } = await getGymContext(request);
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = walkInVisitQuerySchema.safeParse(params);
    if (!parsed.success) {
      return ApiErrors.validationError("Invalid query", parsed.error.issues);
    }

    if (parsed.data.phone) {
      const summary = await getWalkInPhoneSummary(gymId, parsed.data.phone);
      return successResponse({ summary });
    }

    const dateYmd = parsed.data.date ?? todayYmd();
    const visits = await listWalkInVisitsForDate(gymId, dateYmd);
    return successResponse({ visits, date: dateYmd });
  } catch (error) {
    if (error instanceof PermissionError) return ApiErrors.forbidden();
    if (error instanceof GymContextError) return ApiErrors.badRequest(error.message);
    if (error instanceof BusinessRuleViolation) {
      return ApiErrors.badRequest(error.message, { code: error.code });
    }
    logger.error("GET free-trial-visits failed", error as Error);
    return ApiErrors.internal("Failed to fetch walk-in visits");
  }
}

export async function postWalkInVisitHandler(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return ApiErrors.unauthorized();
    requirePermission(session, "canEditMembers");

    const { gymId } = await getGymContext(request);
    const body = await request.json();
    const parsed = createWalkInVisitSchema.safeParse(body);
    if (!parsed.success) {
      return ApiErrors.validationError("Invalid input", parsed.error.issues);
    }

    const visit = await createWalkInVisit({
      ...parsed.data,
      gymId,
      createdById: session.user.id,
    });

    return successResponse({
      message:
        parsed.data.kind === "FREE_TRIAL"
          ? "Free trial recorded"
          : "Day pass recorded",
      visit,
    });
  } catch (error) {
    if (error instanceof PermissionError) return ApiErrors.forbidden();
    if (error instanceof GymContextError) return ApiErrors.badRequest(error.message);
    if (error instanceof BusinessRuleViolation) {
      return ApiErrors.badRequest(error.message, { code: error.code });
    }
    logger.error("POST free-trial-visits failed", error as Error);
    return ApiErrors.internal("Failed to record walk-in visit");
  }
}
