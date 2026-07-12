import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";
import { loadGymReadinessCalibration } from "@/domains/revenue-opportunities/calibration";
import { listHighChurnMembers } from "@/domains/analytics/churn-prediction";

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

    const limit = parseInt(request.nextUrl.searchParams.get("limit") ?? "15", 10);
    const [calibration, highChurn] = await Promise.all([
      loadGymReadinessCalibration(gymId),
      listHighChurnMembers(gymId, Number.isNaN(limit) ? 15 : limit),
    ]);

    return NextResponse.json({
      calibration,
      highChurn,
      llmEnabled: Boolean(process.env.FITNESS360_AI_API_KEY?.trim()),
      note:
        "Rules baseline + optional LLM (AI SDK generateObject on Groq when FITNESS360_AI_API_KEY is set). Recompute on Renewals refreshes top members.",
    });
  } catch {
    return ApiErrors.internal("Failed to load member readiness");
  }
}
