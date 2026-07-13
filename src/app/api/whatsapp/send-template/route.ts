import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { sendWhatsappTemplateHandler } from "@/domains/communications/handlers/send-whatsapp-template";

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "whatsappSend");
  if (rl) return rl;
  return sendWhatsappTemplateHandler(request);
}
