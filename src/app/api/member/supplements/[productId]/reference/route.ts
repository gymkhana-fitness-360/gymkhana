import { cookies } from "next/headers";
import { ApiErrors, successResponse } from "@/lib/api-response";
import { verifyMemberSession } from "@/lib/member-session";
import { getProductMarketplaceReference } from "@/domains/commerce/marketplace-reference";

/** Member opens reference only when viewing a product (no background scraping). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  const cookieStore = await cookies();
  const token = cookieStore.get("member_session")?.value;
  if (!token) return ApiErrors.unauthorized();

  const session = verifyMemberSession(token);
  if (!session) return ApiErrors.unauthorized();

  const { productId } = await params;
  const ref = await getProductMarketplaceReference(
    session.gymId,
    productId,
  );
  if (!ref) return ApiErrors.notFound("Product");

  if (!ref.referenceUrl) {
    return successResponse({
      ...ref,
      message: "No reference link on file. Ask the front desk.",
    });
  }

  return successResponse(ref);
}
