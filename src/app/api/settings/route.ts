import { NextRequest } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { auth } from "@/lib/auth";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { createLogger } from "@/lib/logger";
import { ApiErrors } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { requireApiGymId } from "@/lib/api/gym-context";
import {
  filterAllowedSettingKeys,
  listGymSettings,
  PUBLIC_SETTINGS_KEYS,
  upsertGymSettings,
} from "@/domains/platform/settings/service";

const logger = createLogger("api-settings");

const mutatingBodySchema = z.union([
  z.object({
    key: z.string().min(1),
    value: z.string(),
  }),
  z.object({
    settings: z.record(z.string(), z.string()),
  }),
]);

/**
 * GET /api/settings?keys=key1,key2
 * Returns settings by keys for the active gym.
 */
export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const gymId = await requireApiGymId(session, request);
    if (gymId instanceof Response) return gymId;

    const isAdmin = session.user.role === "ADMIN";
    const keysParam = request.nextUrl.searchParams.get("keys");
    let requestedKeys = keysParam ? keysParam.split(",").map((k) => k.trim()) : [];

    if (!isAdmin) {
      requestedKeys =
        requestedKeys.length === 0
          ? [...PUBLIC_SETTINGS_KEYS]
          : filterAllowedSettingKeys(requestedKeys, false);
    }

    if (requestedKeys.length === 0 && !isAdmin) {
      return successResponse({});
    }

    const result = await listGymSettings(
      gymId,
      requestedKeys.length > 0 ? requestedKeys : undefined,
    );
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

    const gymId = await requireApiGymId(session, request);
    if (gymId instanceof Response) return gymId;

    const parsedBody = await parseJsonBody(request, mutatingBodySchema);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.data;

    const updates: Array<{ key: string; value: string }> = [];
    if ("settings" in body) {
      for (const [k, v] of Object.entries(body.settings)) {
        updates.push({ key: k, value: v });
      }
    } else {
      updates.push({ key: body.key, value: body.value });
    }

    if (updates.length === 0) {
      return ApiErrors.validationError("Provide key/value or settings object");
    }

    await upsertGymSettings(gymId, updates);
    return successResponse({ updated: true });
  } catch (error) {
    logger.error("Settings PUT error:", error as Error);
    return ApiErrors.internal("Failed to update settings");
  }
}
