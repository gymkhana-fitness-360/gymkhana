import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { createLogger } from "@/lib/logger";
import { ApiErrors } from "@/lib/api-handler";
import {
  createReminderHandler,
  listRemindersHandler,
} from "@/domains/communications/handlers/reminders";

const logger = createLogger("api-reminders");

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  try {
    return await listRemindersHandler(request);
  } catch (error) {
    logger.error("Error fetching reminders:", error as Error);
    return ApiErrors.internal("Failed to fetch reminders");
  }
}

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  try {
    return await createReminderHandler(request);
  } catch (error) {
    logger.error("Error creating reminder:", error as Error);
    return ApiErrors.internal("Failed to create reminder");
  }
}
