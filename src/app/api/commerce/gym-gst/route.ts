import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import {
  getGymGstHandler,
  patchGymGstHandler,
} from "@/domains/commerce/handlers/gym-gst";

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;
  return getGymGstHandler(request);
}

export async function PATCH(request: NextRequest) {
  const rl = withRateLimit(request, "moderate");
  if (rl) return rl;
  return patchGymGstHandler(request);
}
