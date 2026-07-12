import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { createLogger } from "@/lib/logger";
import { ApiErrors } from "@/lib/api-handler";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";

const logger = createLogger("api-settings");

const mutatingBodySchema = z
  .object({
    whatsappEnabled: z.boolean().optional(),
    renewalDaysBefore: z.number().optional(),
    renewalOverdueDays: z.number().optional(),
    birthdayEnabled: z.boolean().optional(),
  })
  .passthrough();

const DEFAULTS = {
  notifications_whatsapp_enabled: "true",
  notifications_renewal_days_before: "7",
  notifications_renewal_overdue_days: "3",
  notifications_birthday_enabled: "true",
};

const BASE_KEYS = [
  "notifications_whatsapp_enabled",
  "notifications_renewal_days_before",
  "notifications_renewal_overdue_days",
  "notifications_birthday_enabled",
] as const;

// Settings are scoped per gym by suffixing the key with the gym id, matching the
// convention used elsewhere (e.g. `wabaEnabled:${gymId}`). Keeps tenants isolated.
const scopedKey = (base: string, gymId: string) => `${base}:${gymId}`;

async function getNotificationSettings(gymId: string) {
  const settings = await prisma.setting.findMany({
    where: { key: { in: BASE_KEYS.map((k) => scopedKey(k, gymId)) } },
  });
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  const get = (base: keyof typeof DEFAULTS) => map[scopedKey(base, gymId)] ?? DEFAULTS[base];
  return {
    whatsappEnabled: get("notifications_whatsapp_enabled") === "true",
    renewalDaysBefore: parseInt(get("notifications_renewal_days_before"), 10),
    renewalOverdueDays: parseInt(get("notifications_renewal_overdue_days"), 10),
    birthdayEnabled: get("notifications_birthday_enabled") === "true",
  };
}

/**
 * GET /api/settings/notifications
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

    const config = await getNotificationSettings(gymId);
    return NextResponse.json(config);
  } catch (error) {
    logger.error("Notification settings GET error:", error as Error);
    return ApiErrors.internal("Failed to fetch notification settings");
  }
}

/**
 * PUT /api/settings/notifications
 * Body: { whatsappEnabled?, renewalDaysBefore?, renewalOverdueDays?, birthdayEnabled? }
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

    const gymId = await resolveGymIdForUser(
      session.user.id,
      readRequestedGymIdFromRequest(request)
    );
    if (!gymId) {
      return ApiErrors.validationError("No gym selected or account has no locations.");
    }

    const parsedBody = await parseJsonBody(request, mutatingBodySchema);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.data as {
      whatsappEnabled?: boolean;
      renewalDaysBefore?: number;
      renewalOverdueDays?: number;
      birthdayEnabled?: boolean;
    };
    const updates: Array<{ key: string; value: string }> = [];

    if (typeof body.whatsappEnabled === "boolean") {
      updates.push({
        key: "notifications_whatsapp_enabled",
        value: body.whatsappEnabled ? "true" : "false",
      });
    }
    if (typeof body.renewalDaysBefore === "number" && body.renewalDaysBefore >= 1) {
      updates.push({
        key: "notifications_renewal_days_before",
        value: String(Math.min(30, body.renewalDaysBefore)),
      });
    }
    if (typeof body.renewalOverdueDays === "number" && body.renewalOverdueDays >= 0) {
      updates.push({
        key: "notifications_renewal_overdue_days",
        value: String(Math.min(14, body.renewalOverdueDays)),
      });
    }
    if (typeof body.birthdayEnabled === "boolean") {
      updates.push({
        key: "notifications_birthday_enabled",
        value: body.birthdayEnabled ? "true" : "false",
      });
    }

    for (const { key, value } of updates) {
      const k = scopedKey(key, gymId);
      await prisma.setting.upsert({
        where: { key: k },
        create: { key: k, value },
        update: { value },
      });
    }

    const config = await getNotificationSettings(gymId);
    return NextResponse.json(config);
  } catch (error) {
    logger.error("Notification settings PUT error:", error as Error);
    return ApiErrors.internal("Failed to update notification settings");
  }
}
