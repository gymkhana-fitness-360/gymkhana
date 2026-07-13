import { NextRequest } from "next/server";
import { handleDeprecatedCronGet } from "@/domains/platform/cron-tasks/deprecated-response";

/** @deprecated Use GET /api/cron/unified */
export async function GET(request: NextRequest) {
  return handleDeprecatedCronGet(request);
}
