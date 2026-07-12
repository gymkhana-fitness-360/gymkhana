import { NextRequest } from "next/server";

import { z } from "zod";
import { parseJsonBody } from "@/lib/security/parse-json-body";

const mutatingBodySchema = z.any();
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { createLogger } from "@/lib/logger";
import { ApiErrors } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";

const logger = createLogger("api-settings");

// Public settings that any authenticated user can read
const PUBLIC_SETTINGS_KEYS = [
  "sessionTimeoutMinutes",
  "reminderSmsEnabled",
  "reminderWhatsappEnabled",
  "defaultReminderDays",
  "maxReminderDays",
  "minReminderDays",
];

/**
 * GET /api/settings?keys=key1,key2
 * Returns settings by keys.
 * Non-admin users can only access PUBLIC_SETTINGS_KEYS.
 * Admin can access all settings.
 */
export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const isAdmin = session.user.role === "ADMIN";
    const keysParam = request.nextUrl.searchParams.get("keys");
    let requestedKeys = keysParam ? keysParam.split(",").map((k) => k.trim()) : [];

    // Non-admins can only access public settings
    if (!isAdmin) {
      if (requestedKeys.length === 0) {
        // If no keys specified, only return public settings
        requestedKeys = PUBLIC_SETTINGS_KEYS;
      } else {
        // Filter to only public keys
        requestedKeys = requestedKeys.filter((k) => PUBLIC_SETTINGS_KEYS.includes(k));
      }
    }

    // If no keys to fetch (non-admin requested only sensitive keys)
    if (requestedKeys.length === 0 && !isAdmin) {
      return successResponse({});
    }

    const whereClause = requestedKeys.length > 0 
      ? { key: { in: requestedKeys } }
      : undefined;

    const settings = await prisma.setting.findMany({
      where: whereClause,
      orderBy: { key: "asc" },
    });

    const result: Record<string, string> = {};
    for (const s of settings) result[s.key] = s.value;
    return successResponse(result);
  } catch (error) {
    logger.error("Settings GET error:", error as Error);
    return ApiErrors.internal("Failed to fetch settings");
  }
}

/**
 * PUT /api/settings
 * Body: { key: string, value: string } or { settings: Record<string, string> }
 * Admin only.
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
      return ApiErrors.forbidden("Admin access required");
    }

    const parsedBody = await parseJsonBody(request, mutatingBodySchema);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.data as any;
    const updates: Array<{ key: string; value: string }> = [];

    if (body.settings && typeof body.settings === "object") {
      for (const [k, v] of Object.entries(body.settings)) {
        if (typeof v === "string") updates.push({ key: k, value: v });
      }
    } else if (body.key && typeof body.value === "string") {
      updates.push({ key: body.key, value: body.value });
    }

    if (updates.length === 0) {
      return ApiErrors.validationError("Provide key/value or settings object");
    }

    for (const { key, value } of updates) {
      await prisma.setting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      });
    }

    return successResponse({ updated: true });
  } catch (error) {
    logger.error("Settings PUT error:", error as Error);
    return ApiErrors.internal("Failed to update settings");
  }
}
