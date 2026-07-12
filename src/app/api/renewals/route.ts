import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { listRenewalsDashboardHandler } from "@/domains/memberships/handlers/list-renewals-dashboard";

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;
  return listRenewalsDashboardHandler(request);
}
