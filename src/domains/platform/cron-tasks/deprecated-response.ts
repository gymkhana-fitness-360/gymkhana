import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { verifyCronRequest } from "@/lib/cron-auth";
import { ApiErrors } from "@/lib/api-handler";
import { deprecatedCronResponse } from "@/lib/cron/deprecated-response";

/** @deprecated Use GET /api/cron/unified — cron auth only. */
export async function handleDeprecatedCronGet(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return ApiErrors.unauthorized();
  }
  return deprecatedCronResponse();
}

/** @deprecated Use GET /api/cron/unified — cron auth or admin session. */
export async function handleDeprecatedCronGetWithAdmin(request: NextRequest) {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  if (!verifyCronRequest(request) && !isAdmin) {
    return ApiErrors.unauthorized();
  }
  return deprecatedCronResponse();
}

export { deprecatedCronResponse };
