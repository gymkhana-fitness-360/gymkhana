import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { assistantConfigHandler } from "@/domains/platform/assistant/config";

export const runtime = "nodejs";

/** Public config for Fitness360 AI UI — never exposes the API key. */
export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;
  return assistantConfigHandler();
}
