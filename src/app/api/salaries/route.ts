import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { createLogger } from "@/lib/logger";
import { ApiErrors } from "@/lib/api-handler";
import {
  createSalaryHandler,
  listSalariesHandler,
} from "@/domains/finance/handlers/salaries";

const logger = createLogger("api-salaries");

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  try {
    return await listSalariesHandler(request);
  } catch (error) {
    logger.error("Error fetching salaries:", error as Error);
    return ApiErrors.internal("Failed to fetch salaries");
  }
}

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  try {
    return await createSalaryHandler(request);
  } catch (error) {
    logger.error("Error creating salary:", error as Error);
    return ApiErrors.internal("Failed to create salary");
  }
}
