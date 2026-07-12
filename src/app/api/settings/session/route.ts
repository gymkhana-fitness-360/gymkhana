import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { createLogger } from "@/lib/logger";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";

const logger = createLogger("api-settings");

const mutatingBodySchema = z
  .object({ timeoutMinutes: z.number().optional() })
  .passthrough();

const DEFAULT_TIMEOUT = "240";
// Per-gym key (suffixed with gym id), matching the convention used elsewhere.
const sessionKey = (gymId: string) => `session_timeout_minutes:${gymId}`;

async function getSessionSettings(gymId: string) {
  const row = await prisma.setting.findUnique({ where: { key: sessionKey(gymId) } });
  return { timeoutMinutes: parseInt(row?.value ?? DEFAULT_TIMEOUT, 10) };
}

/**
 * GET /api/settings/session
 * Returns session timeout config. Any authenticated user can read.
 */
export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const gymId = await resolveGymIdForUser(
      session.user.id,
      readRequestedGymIdFromRequest(request)
    );
    if (!gymId) {
      return ApiErrors.validationError("No gym selected or account has no locations.");
    }

    const config = await getSessionSettings(gymId);
    return NextResponse.json(config);
  } catch (error) {
    logger.error("Session settings GET error:", error as Error);
    return ApiErrors.internal("Failed to fetch session settings");
  }
}

/**
 * PUT /api/settings/session
 * Body: { timeoutMinutes?: number }
 * Admin only. Session timeout is not applicable to admins.
 */
export async function PUT(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }
    if (session.user.role !== "ADMIN") {
      return ApiErrors.forbidden();
    }

    const gymId = await resolveGymIdForUser(
      session.user.id,
      readRequestedGymIdFromRequest(request)
    );
    if (!gymId) {
      return ApiErrors.validationError("No gym selected or account has no locations.");
    }

    const parsedBody = await parseJsonBody(request, mutatingBodySchema);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.data as { timeoutMinutes?: number };

    if (typeof body.timeoutMinutes === "number" && body.timeoutMinutes >= 15) {
      const key = sessionKey(gymId);
      const value = String(Math.min(10080, body.timeoutMinutes)); // max 7 days
      await prisma.setting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      });
    }

    const config = await getSessionSettings(gymId);
    return NextResponse.json(config);
  } catch (error) {
    logger.error("Session settings PUT error:", error as Error);
    return ApiErrors.internal("Failed to update session settings");
  }
}
