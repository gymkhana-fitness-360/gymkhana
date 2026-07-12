import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { ApiErrors, successResponse } from "@/lib/api-response";
import { getApiGymId } from "@/lib/api/gym-context";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import {
  getProductMarketplaceReference,
  setProductMarketplaceReference,
} from "@/domains/commerce/marketplace-reference";

/** Admin/member read: stored reference only (no Amazon API/scrape). */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  const session = await auth();
  if (!session?.user) return ApiErrors.unauthorized();
  const gymId = await getApiGymId(session, request);
  if (!gymId) return ApiErrors.badRequest("No gym selected");

  const { id } = await params;
  const ref = await getProductMarketplaceReference(gymId, id);
  if (!ref) return ApiErrors.notFound("Product");

  return successResponse(ref);
}

const patchSchema = z.object({
  referenceUrl: z.string().url().nullable().optional(),
  referenceNote: z.string().max(300).nullable().optional(),
});

/** Admin only: paste Amazon.in product URL after manual verification. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();
  if (session.user.role !== "ADMIN") {
    return ApiErrors.forbidden("Admin access required");
  }

  const gymId = await getApiGymId(session, request);
  if (!gymId) return ApiErrors.badRequest("No gym selected");

  const { id } = await params;
  const parsed = await parseJsonBody(request, patchSchema);
  if (!parsed.ok) return parsed.response;

  const result = await setProductMarketplaceReference(
    gymId,
    id,
    session.user.id,
    {
      referenceUrl: parsed.data.referenceUrl,
      referenceNote: parsed.data.referenceNote,
    },
  );

  if (!result) return ApiErrors.notFound("Product");
  if ("error" in result) {
    if (result.error === "invalid_amazon_url") {
      return ApiErrors.validationError(
        "Only amazon.in or amazon.com HTTPS URLs are allowed",
      );
    }
    return ApiErrors.notFound("Product");
  }

  return successResponse({ product: result });
}
