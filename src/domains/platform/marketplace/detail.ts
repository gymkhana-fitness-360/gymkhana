import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { ApiErrors, successResponse } from "@/lib/api-response";
import { requirePermission, PermissionError } from "@/lib/permissions";
import { getMarketplaceApp } from "@/data/marketplace/catalog";
import { setMarketplaceInstall } from "@/lib/marketplace/install";
import { getApiGymId } from "@/lib/api/gym-context";

const bodySchema = z.object({
  enabled: z.boolean(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export async function patchMarketplaceInstallHandler(
  request: NextRequest,
  slug: string,
) {
  const session = await auth();
  if (!session?.user) return ApiErrors.unauthorized();

  try {
    requirePermission(session, "canEditMembers");
  } catch (error) {
    if (error instanceof PermissionError) return ApiErrors.forbidden();
    throw error;
  }

  if (!getMarketplaceApp(slug)) return ApiErrors.notFound("Unknown marketplace app");

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return ApiErrors.validationError("Invalid body", parsed.error.issues);
  }

  const gymId = await getApiGymId(session, request);
  if (!gymId) return ApiErrors.badRequest("No gym selected");

  try {
    const row = await setMarketplaceInstall(
      gymId,
      slug,
      parsed.data.enabled,
      parsed.data.config as Prisma.InputJsonValue | undefined,
    );
    return successResponse({ install: row });
  } catch {
    return ApiErrors.badRequest("Could not update marketplace install");
  }
}
