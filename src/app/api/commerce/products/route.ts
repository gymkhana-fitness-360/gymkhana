import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getGymContext, GymContextError } from "@/domains/tenancy";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { createProduct, listProducts } from "@/domains/commerce/products";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  category: z.enum(["MERCH", "SUPPLEMENT"]).optional(),
  priceInr: z.number().positive(),
  description: z.string().max(500).optional(),
  hsnCode: z.string().regex(/^\d{4,8}$/).optional(),
  gstRatePercent: z.number().min(0).max(28).optional(),
  priceIncludesGst: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  try {
    const { gymId } = await getGymContext(request);
    const products = await listProducts(gymId);
    return NextResponse.json({ products });
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    return ApiErrors.internal("Failed to list products");
  }
}

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "moderate");
  if (rl) return rl;

  try {
    const { gymId } = await getGymContext(request);
    const session = await auth();
    if (!session?.user?.id) return ApiErrors.unauthorized();

    const parsed = await parseJsonBody(request, createSchema);
    if (!parsed.ok) return parsed.response;

    const product = await createProduct(gymId, parsed.data);
    return NextResponse.json({ product }, { status: 201 });
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    return ApiErrors.internal("Failed to create product");
  }
}
