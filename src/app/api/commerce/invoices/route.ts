import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { ApiErrors, successResponse } from "@/lib/api-response";
import { getApiGymId } from "@/lib/api/gym-context";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import {
  createSupplementGstInvoice,
  listSupplementGstInvoices,
} from "@/domains/commerce/gst-invoice";

const createSchema = z.object({
  memberId: z.string().optional(),
  buyerName: z.string().optional(),
  buyerPhone: z.string().optional(),
  buyerGstin: z.string().optional(),
  orderLineIds: z.array(z.string()).optional(),
  placeOfSupplyState: z.string().optional(),
  notes: z.string().optional(),
  issue: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return ApiErrors.unauthorized();
  const gymId = await getApiGymId(session, request);
  if (!gymId) return ApiErrors.badRequest("No gym selected");

  const memberId = request.nextUrl.searchParams.get("memberId") ?? undefined;
  const invoices = await listSupplementGstInvoices(gymId, { memberId });
  return successResponse({ invoices });
}

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "moderate");
  if (rl) return rl;

  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();
  const gymId = await getApiGymId(session, request);
  if (!gymId) return ApiErrors.badRequest("No gym selected");

  const parsed = await parseJsonBody(request, createSchema);
  if (!parsed.ok) return parsed.response;

  const result = await createSupplementGstInvoice(
    gymId,
    session.user.id,
    parsed.data,
  );

  if ("error" in result && result.error) {
    if (result.error === "gym_gstin_required") {
      return ApiErrors.validationError(
        "Set gym GSTIN under Supplements → Seller GST settings before issuing tax invoices.",
      );
    }
    if (result.error === "invalid_hsn") {
      return ApiErrors.validationError("Product missing valid HSN code");
    }
    return ApiErrors.badRequest(result.error);
  }

  return successResponse({ invoice: result.invoice }, 201);
}
