import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { listPublicMembersV1 } from "@/domains/members/handlers/list-members-v1";

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;
  return listPublicMembersV1(request);
}
