import type { NextRequest } from "next/server";
import { fixMemberExpiryHandler } from "@/domains/members/handlers/fix-member-expiry";

export async function POST(request: NextRequest) {
  return fixMemberExpiryHandler(request);
}
