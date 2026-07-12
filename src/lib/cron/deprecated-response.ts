import { NextResponse } from "next/server";

export const DEPRECATED_CRON_RESPONSE = {
  deprecated: true,
  use: "/api/cron/unified",
} as const;

export function deprecatedCronResponse() {
  return NextResponse.json(DEPRECATED_CRON_RESPONSE, { status: 410 });
}
