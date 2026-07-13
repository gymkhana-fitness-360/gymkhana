import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { createLogger } from "@/lib/logger";
import { ApiErrors } from "@/lib/api-handler";
import {
  joinChallengeHandler,
  leaveChallengeHandler,
  updateChallengeParticipantHandler,
} from "@/domains/challenges/handlers/participants";

const logger = createLogger("api-challenges");

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;
  try {
    return await joinChallengeHandler(request);
  } catch (error) {
    logger.error("Error joining challenge:", error as Error);
    return ApiErrors.internal("Failed to join challenge");
  }
}

export async function PATCH(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;
  try {
    return await updateChallengeParticipantHandler(request);
  } catch (error) {
    logger.error("Error updating participant:", error as Error);
    return ApiErrors.internal("Failed to update participant");
  }
}

export async function DELETE(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;
  try {
    return await leaveChallengeHandler(request);
  } catch (error) {
    logger.error("Error leaving challenge:", error as Error);
    return ApiErrors.internal("Failed to leave challenge");
  }
}
