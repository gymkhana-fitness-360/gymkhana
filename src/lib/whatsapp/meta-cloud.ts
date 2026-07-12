import { createLogger } from "@/lib/logger";

const logger = createLogger("meta-waba");

export function isMetaWabaConfigured(): boolean {
  return Boolean(
    process.env.META_WABA_ACCESS_TOKEN &&
      process.env.META_WABA_PHONE_NUMBER_ID,
  );
}

export type MetaWabaSendResult =
  | { ok: true; messageId: string }
  | { ok: false; reason: string };

/** Meta WhatsApp Cloud API text send (GTM-W-001). */
export async function sendMetaWabaText(
  toPhone: string,
  body: string,
): Promise<MetaWabaSendResult> {
  const token = process.env.META_WABA_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_WABA_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    return { ok: false, reason: "not_configured" };
  }

  const digits = toPhone.replace(/\D/g, "");
  const to = digits.length === 10 ? `91${digits}` : digits;

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body },
        }),
      },
    );

    const json = (await res.json()) as {
      messages?: { id: string }[];
      error?: { message?: string };
    };

    if (!res.ok) {
      logger.warn("Meta WABA send failed", { status: res.status, json });
      return {
        ok: false,
        reason: json.error?.message ?? `http_${res.status}`,
      };
    }

    const messageId = json.messages?.[0]?.id ?? "unknown";
    return { ok: true, messageId };
  } catch (e) {
    logger.error("Meta WABA send error", e as Error);
    return {
      ok: false,
      reason: e instanceof Error ? e.message : "send_failed",
    };
  }
}
