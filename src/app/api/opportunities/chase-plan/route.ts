import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";
import { getChasePlan } from "@/domains/revenue-opportunities";
import { getInferenceConfig } from "@/lib/inference/provider";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api-chase-plan");

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

    const limit = parseInt(request.nextUrl.searchParams.get("limit") ?? "25", 10);
    const predictionParam = request.nextUrl.searchParams.get("prediction");
    const prediction =
      predictionParam === "LIKELY_TO_PAY" ||
      predictionParam === "AT_RISK" ||
      predictionParam === "UNLIKELY"
        ? predictionParam
        : undefined;

    const plan = await getChasePlan(
      gymId,
      Number.isNaN(limit) ? 25 : limit,
      prediction ? { predictionLabel: prediction } : undefined,
    );
    const inference = getInferenceConfig();
    return NextResponse.json({
      ...plan,
      inference: {
        ...inference,
        enabled: plan.inference?.enabled ?? inference.enabled,
        llmAssessedCount: plan.inference?.llmAssessedCount ?? 0,
      },
    });
  } catch (error) {
    logger.error("Failed to build chase plan", error as Error);
    return ApiErrors.internal("Failed to build chase plan");
  }
}
