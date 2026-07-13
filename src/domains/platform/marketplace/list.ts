import { NextRequest } from "next/server";
import { ApiErrors } from "@/lib/api-handler";
import { requirePermission, PermissionError } from "@/lib/permissions";
import { listMarketplaceInstalls } from "@/lib/marketplace/install";
import { ALL_MARKETPLACE_APPS } from "@/data/marketplace/catalog";
import { getApiGymId } from "@/lib/api/gym-context";
import { successResponse } from "@/lib/api-response";
import type { Session } from "next-auth";

export async function listMarketplaceHandler(request: NextRequest, session: Session) {
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
}
