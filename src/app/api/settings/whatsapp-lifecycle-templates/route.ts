import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import {
  getWhatsappLifecycleTemplatesHandler,
  postWhatsappLifecycleTemplatesHandler,
  putWhatsappLifecycleTemplatesHandler,
} from "@/domains/platform/settings/handlers/whatsapp-lifecycle-templates";

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;
  return getWhatsappLifecycleTemplatesHandler(request);
}

export async function PUT(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;
  return putWhatsappLifecycleTemplatesHandler(request);
}

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;
  return postWhatsappLifecycleTemplatesHandler(request);
}
