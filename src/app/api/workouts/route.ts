import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { createLogger } from "@/lib/logger";
import { ApiErrors } from "@/lib/api-handler";
import {
  createWorkoutHandler,
  deleteWorkoutHandler,
  listWorkoutsHandler,
} from "@/domains/fitness/handlers/workout-crud";

const logger = createLogger("api-workouts");

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;
  try {
    return await listWorkoutsHandler(request);
  } catch (error) {
    logger.error("Error fetching workouts:", error as Error);
    return ApiErrors.internal("Failed to fetch workouts");
  }
}

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;
  try {
    return await createWorkoutHandler(request);
  } catch (error) {
    logger.error("Error creating workout:", error as Error);
    return ApiErrors.internal("Failed to create workout");
  }
}

export async function DELETE(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;
  try {
    return await deleteWorkoutHandler(request);
  } catch (error) {
    logger.error("Error deleting workout:", error as Error);
    return ApiErrors.internal("Failed to delete workout");
  }
}
