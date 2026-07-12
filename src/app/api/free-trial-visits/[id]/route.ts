import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { createLogger } from "@/lib/logger";
import { ApiErrors, successResponse } from "@/lib/api-response";
import { requirePermission, PermissionError } from "@/lib/permissions";
import { BusinessRuleViolation } from "@/lib/crud-business-validation";
import { deleteWalkInVisit } from "@/domains/attendance/services/walk-in-visit.service";
import { getGymContext, GymContextError } from "@/domains/tenancy";

const logger = createLogger("api-free-trial-visits-id");

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session?.user) {
      return ApiErrors.unauthorized();
    }
    try {
      requirePermission(session, "canEditMembers");
    } catch (error) {
      if (error instanceof PermissionError) {
        return ApiErrors.forbidden();
      }
      throw error;
    }

    const { gymId } = await getGymContext(request);
    const { id } = await params;
    await deleteWalkInVisit(gymId, id);
    return successResponse({ message: "Walk-in visit removed", id });
  } catch (error) {
    if (error instanceof GymContextError) {
      return ApiErrors.badRequest(error.message);
    }
    if (error instanceof BusinessRuleViolation) {
      if (error.code === "NOT_FOUND") {
        return ApiErrors.notFound("Walk-in visit");
      }
      return ApiErrors.badRequest(error.message, { code: error.code });
    }
    logger.error("DELETE free-trial-visits failed", error as Error);
    return ApiErrors.internal("Failed to delete walk-in visit");
  }
}
