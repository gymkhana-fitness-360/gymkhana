import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { whatsappHealthHandler } from "@/domains/communications/handlers/whatsapp-health";

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;
  return whatsappHealthHandler();
}
