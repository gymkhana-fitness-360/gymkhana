import type { NextRequest } from "next/server";
import { fixMemberDateHandler } from "@/domains/members/handlers/fix-member-date";

export async function POST(request: NextRequest) {
  return fixMemberDateHandler(request);
}
