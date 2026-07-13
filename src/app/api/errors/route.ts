import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { listErrorLogsHandler } from "@/domains/platform/handlers/error-ingest";

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;
  return listErrorLogsHandler(request);
}
