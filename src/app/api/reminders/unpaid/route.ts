import { NextRequest } from "next/server";
import { ApiErrors } from "@/lib/api-handler";
import { auth } from "@/lib/auth";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { createLogger } from "@/lib/logger";
import { reminderUnpaidHandler } from "@/domains/communications/handlers/reminder-unpaid";
import { getReminderUnpaidQueries } from "@/domains/communications/adapters";

const logger = createLogger("api-reminders");

/**
 * GET /api/reminders/unpaid
 * Members reminded but still overdue (gym-scoped).
 */
export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    return reminderUnpaidHandler(request, getReminderUnpaidQueries());
  } catch (error) {
    logger.error("[GET /api/reminders/unpaid]", error as Error);
    return ApiErrors.internal("Failed to fetch unpaid reminders");
  }
}
