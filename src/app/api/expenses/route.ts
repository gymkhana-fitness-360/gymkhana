import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { createLogger } from "@/lib/logger";
import { ApiErrors } from "@/lib/api-handler";
import { listExpensesHandler } from "@/domains/expenses/handlers/list-expenses";
import { createExpenseHandler } from "@/domains/expenses/handlers/create-expense";

const logger = createLogger("api-expenses");

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;
  try {
    return await listExpensesHandler(request);
  } catch (error) {
    logger.error("Error fetching expenses:", error as Error);
    return ApiErrors.internal("Failed to fetch expenses");
  }
}

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;
  try {
    return await createExpenseHandler(request);
  } catch (error: unknown) {
    logger.error("Error creating expense:", error as Error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return ApiErrors.internal(errorMessage || "Failed to create expense");
  }
}
