import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { whatsappStatusHandler } from "@/domains/communications/handlers/whatsapp-status";

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;
  return whatsappStatusHandler();
}
