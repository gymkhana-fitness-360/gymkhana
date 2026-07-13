import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { assistantChatHandler } from "@/domains/platform/assistant/handler";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "moderate");
  if (rl) return rl;
  return assistantChatHandler(request);
}
