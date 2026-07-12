import crypto from "crypto";
import { verifyRazorpayWebhookSignature } from "@/lib/payments/razorpay";
import { isProduction } from "@/lib/app-env";

jest.mock("@/lib/app-env", () => ({
  isProduction: jest.fn(),
}));

describe("verifyRazorpayWebhookSignature", () => {
  const originalSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.RAZORPAY_WEBHOOK_SECRET;
    } else {
      process.env.RAZORPAY_WEBHOOK_SECRET = originalSecret;
    }
  });

  it("returns false when secret or signature is missing", () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = "whsec_test";
    expect(verifyRazorpayWebhookSignature("{}", null)).toBe(false);
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
    expect(verifyRazorpayWebhookSignature("{}", "abc")).toBe(false);
  });

  it("validates HMAC signature", () => {
    const secret = "whsec_test";
    const body = '{"event":"payment_link.paid"}';
    const sig = crypto.createHmac("sha256", secret).update(body).digest("hex");
    process.env.RAZORPAY_WEBHOOK_SECRET = secret;
    expect(verifyRazorpayWebhookSignature(body, sig)).toBe(true);
    expect(verifyRazorpayWebhookSignature(body, "bad")).toBe(false);
  });
});

describe("razorpay webhook production policy", () => {
  it("isProduction is mocked for route tests", () => {
    expect(typeof isProduction).toBe("function");
  });
});
