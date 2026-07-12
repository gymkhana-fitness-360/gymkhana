import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { allocateBillPaymentHandler } from "@/domains/billing/handlers/allocate-bill-payment";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;
  const { id } = await params;
  return allocateBillPaymentHandler(request, id);
}
