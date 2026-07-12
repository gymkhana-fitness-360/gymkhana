import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { getGymContext, GymContextError } from "@/domains/tenancy";
import { buildAttendanceHeatmap } from "@/domains/analytics/attendance-heatmap";
import { suggestOfferForQuietPeriod } from "@/domains/offers/service";

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "moderate");
  if (rl) return rl;

  try {
    const { gymId } = await getGymContext(request);
    const session = await auth();
    if (!session?.user?.id) return ApiErrors.unauthorized();

    const heatmap = await buildAttendanceHeatmap(gymId, 28);
    const offer = await suggestOfferForQuietPeriod(gymId, heatmap.quiet);

    return NextResponse.json({ offer, quiet: heatmap.quiet }, { status: 201 });
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    return ApiErrors.internal("Failed to suggest offer");
  }
}
