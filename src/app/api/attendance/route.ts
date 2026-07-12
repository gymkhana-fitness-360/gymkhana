import { NextRequest } from 'next/server';
import { cachedJson } from '@/lib/api-cache';
import { auth } from '@/lib/auth';
import { withRateLimit } from '@/lib/middleware/rate-limit';
import { createLogger } from "@/lib/logger";
import { ApiErrors, successResponse } from "@/lib/api-response";
import { requirePermission, PermissionError } from "@/lib/permissions";
import { recordAttendanceHandler } from "@/domains/attendance/handlers/record-attendance";
import { listAttendanceHandler } from "@/domains/attendance/handlers/list-attendance";
import { getAttendanceService } from "@/domains/attendance/adapters";
import { toApiAttendanceToggleResponse } from "@/domains/attendance/mappers/to-api-attendance-toggle";

const logger = createLogger("api-attendance");

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, 'lenient');
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session?.user) {
      return ApiErrors.unauthorized();
    }

    try {
      requirePermission(session, "canViewMembers");
    } catch (error) {
      if (error instanceof PermissionError) {
        return ApiErrors.forbidden();
      }
      throw error;
    }

    const response = await listAttendanceHandler(request, getAttendanceService());
    if (!response.ok) {
      return response;
    }
    const data = await response.json();
    return cachedJson(data);
  } catch (error) {
    logger.error('Error fetching attendance:', error as Error);
    return ApiErrors.internal('Failed to fetch attendance');
  }
}

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, 'strict');
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

    const response = await recordAttendanceHandler(request, getAttendanceService());
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const message =
        typeof body === "object" && body && "error" in body
          ? String((body as { error: string }).error)
          : "Failed to record attendance";
      if (response.status === 404) {
        return ApiErrors.notFound("Member");
      }
      if (response.status === 403) {
        return ApiErrors.forbidden(message);
      }
      return ApiErrors.badRequest(message);
    }
    const attendance = await response.json();
    return successResponse(toApiAttendanceToggleResponse(attendance));
  } catch (error) {
    logger.error('Error recording attendance:', error as Error);
    return ApiErrors.internal('Failed to record attendance');
  }
}
