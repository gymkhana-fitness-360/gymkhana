import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { createLogger } from "@/lib/logger";
import { ApiErrors } from "@/lib/api-handler";
import { listBillTemplatesHandler } from "@/domains/billing/handlers/list-bill-templates";

const logger = createLogger("api-bills");

/**
 * GET /api/bills/templates
 * Get all active bill templates.
 */
export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  try {
    return await listBillTemplatesHandler();
  } catch (error) {
    logger.error("[GET /api/bills/templates]", error as Error);
    return ApiErrors.internal("Failed to fetch templates");
  }
}
