import type { NextRequest } from "next/server";
import { sendPaymentBillHandler } from "@/domains/payments/handlers/send-payment-bill";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return sendPaymentBillHandler(request, { id });
}
