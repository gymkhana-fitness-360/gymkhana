import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { createRazorpayLinkHandler } from "@/domains/payments/handlers/razorpay-link";

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "moderate");
  if (rl) return rl;
  return createRazorpayLinkHandler(request);
}
