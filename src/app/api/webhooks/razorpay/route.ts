import { NextRequest } from "next/server";
import { razorpayWebhookHandler } from "@/domains/payments/handlers/razorpay-webhook";

export async function POST(request: NextRequest) {
  return razorpayWebhookHandler(request);
}
