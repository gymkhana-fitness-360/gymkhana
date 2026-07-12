import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { getGymContext, GymContextError } from "@/domains/tenancy";
import { createOffer, listOffers } from "@/domains/offers/service";
import { parseJsonBody } from "@/lib/security/parse-json-body";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  discountInr: z.number().positive().optional(),
  validUntil: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date").optional(),
  status: z.enum(["DRAFT", "ACTIVE", "EXPIRED"]).optional(),
});

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  try {
    const { gymId } = await getGymContext(request);
    const status = request.nextUrl.searchParams.get("status");
    const offers = await listOffers(
      gymId,
      status === "DRAFT" || status === "ACTIVE" || status === "EXPIRED"
        ? status
        : undefined,
    );
    return NextResponse.json({ offers });
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    return ApiErrors.internal("Failed to list offers");
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

    const offer = await createOffer(gymId, {
      name: parsed.data.name,
      description: parsed.data.description,
      discountPercent: parsed.data.discountPercent,
      discountInr: parsed.data.discountInr,
      validUntil: parsed.data.validUntil
        ? new Date(parsed.data.validUntil)
        : undefined,
      status: parsed.data.status,
    });

    return NextResponse.json({ offer }, { status: 201 });
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    return ApiErrors.internal("Failed to create offer");
  }
}
