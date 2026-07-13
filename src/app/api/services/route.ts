import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import {
  createServiceHandler,
  listServicesHandler,
} from "@/domains/platform/handlers/services";

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;
  return listServicesHandler(request);
}

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;
  return createServiceHandler(request);
}
