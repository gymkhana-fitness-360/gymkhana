import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { ApiErrors, successResponse } from "@/lib/api-response";
import { getApiGymId } from "@/lib/api/gym-context";
import { resourceBelongsToGym } from "@/domains/tenancy";
import { getSupplementGstInvoice } from "@/domains/commerce/gst-invoice";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return ApiErrors.unauthorized();
  const gymId = await getApiGymId(session, request);
  if (!gymId) return ApiErrors.badRequest("No gym selected");

  const { id } = await params;
  const invoice = await getSupplementGstInvoice(gymId, id);
  if (!resourceBelongsToGym(invoice, gymId)) {
    return ApiErrors.notFound("Invoice");
  }

  return successResponse({ invoice });
}
