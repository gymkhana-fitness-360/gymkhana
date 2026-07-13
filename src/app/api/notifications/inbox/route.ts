import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import {
  listNotificationsInboxHandler,
  markNotificationReadHandler,
} from "@/domains/platform/notifications/inbox";

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;
  return listNotificationsInboxHandler(request);
}

export async function PATCH(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;
  return markNotificationReadHandler(request);
}
