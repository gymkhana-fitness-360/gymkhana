import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import {
  completePasswordResetHandler,
  requestPasswordResetHandler,
} from "@/domains/identity/handlers/password-reset";

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;
  return requestPasswordResetHandler(request);
}

export async function PUT(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;
  return completePasswordResetHandler(request);
}
