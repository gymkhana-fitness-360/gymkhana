import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { publicMemberPayHandler } from "@/domains/payments/handlers/public-member-pay";

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;
  return publicMemberPayHandler(request);
}
