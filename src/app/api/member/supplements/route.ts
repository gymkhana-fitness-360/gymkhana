import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { ApiErrors, successResponse } from "@/lib/api-response";
import { verifyMemberSession } from "@/lib/member-session";
import { listProducts } from "@/domains/commerce/products";
import { listSupplementGstInvoices } from "@/domains/commerce/gst-invoice";

/**
 * Member app: supplements catalog + own GST invoices.
 * Marketplace reference URLs are staff-entered; no price comparison copy.
 */
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("member_session")?.value;
  if (!token) return ApiErrors.unauthorized();

  const session = verifyMemberSession(token);
  if (!session) return ApiErrors.unauthorized();

  const gymId =
    request.nextUrl.searchParams.get("gymId") ?? session.gymId;
  if (gymId !== session.gymId) {
    return ApiErrors.forbidden();
  }

  const products = await listProducts(gymId, true);
  const supplementProducts = products
    .filter((p) => p.category === "SUPPLEMENT")
    .map((p) => ({
      id: p.id,
      name: p.name,
      priceInr: Number(p.priceInr),
      description: p.description,
      hsnCode: p.hsnCode,
      gstRatePercent: Number(p.gstRatePercent),
      hasReferenceLink: Boolean(p.amazonReferenceUrl),
      referenceDisclaimer:
        "If shown, the reference link was added by your gym for ordering context. Prices and availability must be confirmed on the retailer site.",
    }));

  const invoices = await listSupplementGstInvoices(gymId, {
    memberId: session.memberId,
    limit: 20,
  });

  return successResponse({
    products: supplementProducts,
    invoices,
    memberId: session.memberId,
  });
}
