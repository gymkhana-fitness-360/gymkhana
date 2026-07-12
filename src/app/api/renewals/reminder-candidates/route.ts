import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { createLogger } from "@/lib/logger";
import { ApiErrors } from "@/lib/api-handler";
import { renewalCandidatesHandler } from "@/domains/memberships/handlers/renewal-candidates";
import { getRenewalReminderQueries } from "@/domains/memberships/adapters";

const logger = createLogger("api-renewals");

/**
 * GET /api/renewals/reminder-candidates
 * Returns members due for renewal reminders, grouped by 7 days and 3 days.
 * Query params: lookback (30|45|60|90), fromDate (ISO string e.g. 2023-06-01)
 */
export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    return renewalCandidatesHandler(request, getRenewalReminderQueries());
  } catch (error) {
    logger.error("[GET /api/renewals/reminder-candidates]", error as Error);
    return ApiErrors.internal(
      error instanceof Error ? error.message : "Failed to fetch"
    );
  }
}
