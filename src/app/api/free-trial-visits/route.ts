import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import {
  getWalkInVisitsHandler,
  postWalkInVisitHandler,
} from "@/domains/attendance/handlers/walk-in-visits";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "moderate");
  if (rl) return rl;
  return getWalkInVisitsHandler(request);
}

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;
  return postWalkInVisitHandler(request);
}
