import { NextRequest } from "next/server";

import { z } from "zod";
import { parseJsonBody } from "@/lib/security/parse-json-body";

const mutatingBodySchema = z.object({}).passthrough();
import { prisma } from "@/lib/prisma";
import { successResponse } from "@/lib/api-response";
import { verifyRazorpayWebhookSignature } from "@/lib/payments/razorpay";
import { createLogger } from "@/lib/logger";
import { isProduction } from "@/lib/app-env";

const logger = createLogger("webhook-razorpay");

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (isProduction() && !secret) {
    logger.error("RAZORPAY_WEBHOOK_SECRET missing in production");
    return new Response("Webhook not configured", { status: 503 });
  }

  if (!secret) {
    logger.warn("RAZORPAY_WEBHOOK_SECRET unset; accepting webhook without verification (non-production only)");
  } else if (!verifyRazorpayWebhookSignature(raw, signature)) {
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: {
    event?: string;
    payload?: {
      payment_link?: { entity?: { reference_id?: string; status?: string } };
      payment?: { entity?: { amount?: number; status?: string } };
    };
  };

  try {
    payload = JSON.parse(raw) as typeof payload;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const ref = payload.payload?.payment_link?.entity?.reference_id;
  if (ref && payload.event === "payment_link.paid") {
    await prisma.paymentCheckoutLink.updateMany({
      where: { id: ref },
      data: { status: "paid" },
    });
    logger.info("Payment link marked paid", { referenceId: ref });
  }

  return successResponse({ received: true });
}
