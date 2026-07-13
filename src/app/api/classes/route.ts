import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import {
  createClassHandler,
  listClassesHandler,
} from "@/domains/classes/handlers/list-classes";

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;
  return listClassesHandler(request);
}

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "moderate");
  if (rl) return rl;
  return createClassHandler(request);
}
