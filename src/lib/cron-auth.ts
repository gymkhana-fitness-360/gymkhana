import type { NextRequest } from "next/server";
import { getCronSecret } from "@/lib/app-env";

export function verifyCronRequest(request: NextRequest): boolean {
  const secret = getCronSecret();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}
