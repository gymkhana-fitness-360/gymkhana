import { NextRequest } from "next/server";
import { handleDeprecatedCronGetWithAdmin } from "@/domains/platform/cron-tasks/deprecated-response";

/** @deprecated Use GET /api/cron/unified — manual admin trigger still accepted during transition. */
export async function GET(request: NextRequest) {
  return handleDeprecatedCronGetWithAdmin(request);
}

export async function POST(request: NextRequest) {
  return GET(request);
}
