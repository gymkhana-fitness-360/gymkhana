import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { createLogger } from "@/lib/logger";
import { ApiErrors } from "@/lib/api-handler";
import {
  createChallengeHandler,
  deleteChallengeHandler,
  listChallengesHandler,
  updateChallengeHandler,
} from "@/domains/challenges/handlers/challenge-crud";

const logger = createLogger("api-challenges");

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;
  try {
    return await listChallengesHandler(request);
  } catch (error) {
    logger.error("Error fetching challenges:", error as Error);
    return ApiErrors.internal("Failed to fetch challenges");
  }
}

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;
  try {
    return await createChallengeHandler(request);
  } catch (error) {
    logger.error("Error creating challenge:", error as Error);
    return ApiErrors.internal("Failed to create challenge");
  }
}

export async function PATCH(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;
  try {
    return await updateChallengeHandler(request);
  } catch (error) {
    logger.error("Error updating challenge:", error as Error);
    return ApiErrors.internal("Failed to update challenge");
  }
}

export async function DELETE(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;
  try {
    return await deleteChallengeHandler(request);
  } catch (error) {
    logger.error("Error deleting challenge:", error as Error);
    return ApiErrors.internal("Failed to delete challenge");
  }
}
