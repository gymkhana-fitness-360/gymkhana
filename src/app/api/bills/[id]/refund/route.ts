import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { refundBillHandler } from "@/domains/billing/handlers/refund-bill";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;
  const { id } = await params;
  return refundBillHandler(request, id);
}
