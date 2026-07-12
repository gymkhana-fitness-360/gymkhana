import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createLogger } from "@/lib/logger";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import {
  generateAttendanceQrHandler,
  checkInViaQrHandler,
} from "@/domains/attendance/handlers/qr-checkin";
import { getAttendanceQrService } from "@/domains/attendance/adapters";
import { toApiQrCheckInResponse } from "@/domains/attendance/mappers/to-api-qr-checkin";

const logger = createLogger("api-attendance");

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session?.user) {
      return ApiErrors.unauthorized();
    }

    const response = await generateAttendanceQrHandler(
      request,
      getAttendanceQrService()
    );
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const message =
        typeof body === "object" && body && "error" in body
          ? String((body as { error: string }).error)
          : "Failed to generate QR code";
      if (response.status === 404) {
        return ApiErrors.notFound("Member");
      }
      return ApiErrors.validationError(message);
    }
    return response;
  } catch (error) {
    logger.error('Error generating QR code:', error as Error);
    return ApiErrors.internal('Failed to generate QR code');
  }
}

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session?.user) {
      return ApiErrors.unauthorized();
    }

    const response = await checkInViaQrHandler(request, getAttendanceQrService());
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
      return ApiErrors.validationError(message);
    }
    const attendance = await response.json();
    return NextResponse.json(toApiQrCheckInResponse(attendance));
  } catch (error) {
    logger.error('Error recording attendance:', error as Error);
    return ApiErrors.internal('Failed to record attendance');
  }
}
