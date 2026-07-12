import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { analyticsSummaryHandler } from "@/domains/analytics/handlers/summary";
import { auth } from "@/lib/auth";
import { ApiErrors } from "@/lib/api-handler";

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;
  const session = await auth();
  if (!session) return ApiErrors.unauthorized();
  return analyticsSummaryHandler(request);
}
