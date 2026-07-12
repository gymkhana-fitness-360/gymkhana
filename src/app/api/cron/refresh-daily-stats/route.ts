import { NextRequest } from "next/server";
import { verifyCronRequest } from "@/lib/cron-auth";
import { ApiErrors } from "@/lib/api-handler";
import { deprecatedCronResponse } from "@/lib/cron/deprecated-response";

/** @deprecated Use GET /api/cron/unified */
export async function GET(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return ApiErrors.unauthorized();
  }
  return deprecatedCronResponse();
}
