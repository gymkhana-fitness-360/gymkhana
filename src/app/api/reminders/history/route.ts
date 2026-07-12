import { NextRequest } from "next/server";
import { ApiErrors } from "@/lib/api-handler";
import { auth } from "@/lib/auth";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { createLogger } from "@/lib/logger";
import { communicationEventsHistoryHandler } from "@/domains/communications/handlers/communication-events-history";

const logger = createLogger("api-reminders");

/**
 * GET /api/reminders/history
 * CommunicationEvent rows (WhatsApp outbound) for the active gym.
 */
export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    return communicationEventsHistoryHandler(request);
  } catch (error) {
    logger.error("[GET /api/reminders/history]", error as Error);
    return ApiErrors.internal("Failed to fetch reminder history");
  }
}
