import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { sendBulkRenewalRemindersHandler } from "@/domains/memberships/handlers/send-bulk-renewal-reminders";

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;
  return sendBulkRenewalRemindersHandler(request);
}
