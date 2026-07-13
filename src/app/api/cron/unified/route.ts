/**
 * Unified Cron — single Vercel-scheduled maintenance path.
 * Legacy standalone /api/cron/* routes return 410 Gone.
 */
import { NextRequest } from "next/server";
import { createLogger } from "@/lib/logger";
import { ApiErrors } from "@/lib/api-handler";
import { verifyCronRequest } from "@/lib/cron-auth";
import { runUnifiedCronMaintenance } from "@/domains/platform/cron-tasks/run-unified";

const logger = createLogger("cron-unified");

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    logger.warn("Unauthorized cron attempt");
    return ApiErrors.unauthorized();
  }
  return runUnifiedCronMaintenance();
}
