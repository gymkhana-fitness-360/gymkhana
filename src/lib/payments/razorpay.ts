import crypto from "crypto";
import { createLogger } from "@/lib/logger";

const logger = createLogger("razorpay");

export function isRazorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export interface CreatePaymentLinkInput {
  amountInr: number;
  description: string;
  customerName?: string;
  customerPhone?: string;
  referenceId: string;
}

export interface CreatePaymentLinkResult {
  id: string;
  shortUrl: string;
  status: string;
}

/** Create a Razorpay payment link when keys are set; otherwise return a demo checkout URL. */
export async function createRazorpayPaymentLink(
  input: CreatePaymentLinkInput,
): Promise<CreatePaymentLinkResult> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    const demoId = `demo_${input.referenceId}`;
    logger.info("Razorpay not configured; returning demo payment link", { referenceId: input.referenceId });
    return {
      id: demoId,
      shortUrl: `/member/pay?ref=${encodeURIComponent(input.referenceId)}&demo=1`,
      status: "created",
    };
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const body = {
    amount: Math.round(input.amountInr * 100),
    currency: "INR",
    description: input.description,
    reference_id: input.referenceId,
    customer: {
      name: input.customerName ?? "Member",
      contact: input.customerPhone ?? undefined,
    },
    notify: { sms: false, email: false },
    reminder_enable: true,
  };

  const res = await fetch("https://api.razorpay.com/v1/payment_links", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    logger.error(`Razorpay payment link failed: ${res.status} ${text}`);
    throw new Error("Failed to create Razorpay payment link");
  }

  const data = (await res.json()) as { id: string; short_url: string; status: string };
  return {
    id: data.id,
    shortUrl: data.short_url,
    status: data.status,
  };
}

export function verifyRazorpayWebhookSignature(
  body: string,
  signature: string | null,
): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return expected === signature;
}
