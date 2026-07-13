import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import {
  getSettingsHandler,
  putSettingsHandler,
} from "@/domains/platform/settings/handlers/crud-settings";

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;
  return getSettingsHandler(request);
}

export async function PUT(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;
  return putSettingsHandler(request);
}
