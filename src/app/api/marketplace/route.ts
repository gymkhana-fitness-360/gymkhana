import { NextResponse } from "next/server";
import { createApiHandler, ApiErrors } from "@/lib/api-handler";
import { requirePermission, PermissionError } from "@/lib/permissions";
import { listMarketplaceInstalls } from "@/lib/marketplace/install";
import { ALL_MARKETPLACE_APPS } from "@/data/marketplace/catalog";
import { getApiGymId } from "@/lib/api/gym-context";
import { successResponse } from "@/lib/api-response";

export const GET = createApiHandler(
  async (request, { session }) => {
    try {
      requirePermission(session, "canEditMembers");
    } catch (error) {
      if (error instanceof PermissionError) return ApiErrors.forbidden();
      throw error;
    }
    const gymId = await getApiGymId(session, request);
    if (!gymId) return ApiErrors.badRequest("No gym selected");
    const installed = await listMarketplaceInstalls(gymId);
    return successResponse({ apps: ALL_MARKETPLACE_APPS, installed });
  },
  { rateLimit: "lenient", permission: "canEditMembers" },
);
