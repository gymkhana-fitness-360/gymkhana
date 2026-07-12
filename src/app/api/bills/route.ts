import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { createBillHandler } from "@/domains/billing/handlers/create-bill";
import { listBillsHandler } from "@/domains/billing/handlers/list-bills";
import { auth } from "@/lib/auth";
import { ApiErrors } from "@/lib/api-handler";

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();
  return createBillHandler(request);
}

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();
  return listBillsHandler(request);
}
