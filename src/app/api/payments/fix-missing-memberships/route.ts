import type { NextRequest } from "next/server";
import { fixMissingMembershipsHandler } from "@/domains/payments/handlers/fix-missing-memberships";

export async function POST(request: NextRequest) {
  return fixMissingMembershipsHandler(request);
}
