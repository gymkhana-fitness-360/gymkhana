import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { sendRenewalReminderHandler } from "@/domains/memberships/handlers/send-renewal-reminder";

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;
  return sendRenewalReminderHandler(request);
}
