import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { bulkWhatsAppHandler } from "@/domains/communications/handlers/bulk-whatsapp";

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "whatsappBulk");
  if (rl) return rl;
  const session = await auth();
  if (!session) return ApiErrors.unauthorized();
  return bulkWhatsAppHandler(request);
}
