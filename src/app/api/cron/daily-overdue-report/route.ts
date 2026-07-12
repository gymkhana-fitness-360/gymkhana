import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { verifyCronRequest } from "@/lib/cron-auth";
import { ApiErrors } from "@/lib/api-handler";
import { deprecatedCronResponse } from "@/lib/cron/deprecated-response";

/** @deprecated Use GET /api/cron/unified — manual admin trigger still accepted during transition. */
export async function GET(request: NextRequest) {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  if (!verifyCronRequest(request) && !isAdmin) {
    return ApiErrors.unauthorized();
  }
  return deprecatedCronResponse();
}

export async function POST(request: NextRequest) {
  return GET(request);
}
