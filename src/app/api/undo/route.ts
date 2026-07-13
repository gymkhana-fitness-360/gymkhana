import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import {
  executeUndoHandler,
  getUndoAvailabilityHandler,
} from "@/domains/platform/handlers/undo";

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;
  return getUndoAvailabilityHandler(request);
}

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;
  return executeUndoHandler(request);
}

export const dynamic = "force-dynamic";
