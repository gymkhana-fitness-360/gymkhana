import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { whatsappInitializeHandler } from "@/domains/communications/handlers/whatsapp-initialize";

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "whatsappSession");
  if (rl) return rl;
  return whatsappInitializeHandler();
}
