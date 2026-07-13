import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { createLogger } from "@/lib/logger";
import { ApiErrors } from "@/lib/api-handler";
import {
  createUserHandler,
  listUsersHandler,
} from "@/domains/platform/users/handlers/list-users";

const logger = createLogger("api-users");

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  try {
    return await listUsersHandler(request);
  } catch (error) {
    logger.error("Failed to fetch users", error as Error);
    return ApiErrors.internal("Failed to fetch users");
  }
}

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  try {
    return await createUserHandler(request);
  } catch (error) {
    logger.error("Error creating user:", error as Error);
    return ApiErrors.internal("Failed to create user");
  }
}
