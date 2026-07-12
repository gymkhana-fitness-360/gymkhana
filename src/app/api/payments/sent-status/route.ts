import type { NextRequest } from "next/server";
import { paymentSentStatusHandler } from "@/domains/payments/handlers/payment-sent-status";

export async function GET(request: NextRequest) {
  return paymentSentStatusHandler(request);
}
