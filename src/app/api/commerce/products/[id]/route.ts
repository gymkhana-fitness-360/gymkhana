import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getGymContext, GymContextError } from "@/domains/tenancy";
import { ApiErrors } from "@/lib/api-handler";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { updateProduct } from "@/domains/commerce/products";

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  priceInr: z.number().positive().optional(),
  description: z.string().max(500).nullable().optional(),
  hsnCode: z.string().regex(/^\d{4,8}$/).nullable().optional(),
  gstRatePercent: z.number().min(0).max(28).optional(),
  priceIncludesGst: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { gymId } = await getGymContext(request);
    const session = await auth();
    if (!session?.user?.id) return ApiErrors.unauthorized();

    const { id } = await params;
    const parsed = await parseJsonBody(request, patchSchema);
    if (!parsed.ok) return parsed.response;

    const product = await updateProduct(gymId, id, parsed.data);
    if (!product) return ApiErrors.notFound("Product");
    return NextResponse.json({ product });
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    return ApiErrors.internal("Failed to update product");
  }
}
