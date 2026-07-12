import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";
import { getPaymentTimingInsights } from "@/domains/payments/payment-timing-insights";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api-payment-timing");

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session?.user?.id) return ApiErrors.unauthorized();

    const gymId = await resolveGymIdForUser(
      session.user.id,
      readRequestedGymIdFromRequest(request),
    );
    if (!gymId) {
      return ApiErrors.badRequest("No gym selected or account has no locations.");
    }

    const memberId = request.nextUrl.searchParams.get("memberId") ?? undefined;
    const insights = await getPaymentTimingInsights(gymId, memberId);
    return NextResponse.json(insights);
  } catch (error) {
    logger.error("Payment timing failed", error as Error);
    return ApiErrors.internal("Failed to load payment timing");
  }
}
