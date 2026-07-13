import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { logAction } from "@/lib/audit-logger";
import { createLogger } from "@/lib/logger";
import { ApiErrors } from "@/lib/api-handler";
import {
  WHATSAPP_NOT_CONFIGURED,
  WHATSAPP_SETUP_HINT,
} from "@/lib/messaging/whatsapp-copy";
import { parseJsonBody } from "@/lib/security/parse-json-body";

const logger = createLogger("api-whatsapp");

const WHATSAPP_SERVICE_URL =
  process.env.WHATSAPP_SERVICE_URL || "http://localhost:4000";

const sendTemplateSchema = z
  .object({
    phone: z.string().optional(),
    phoneNumber: z.string().optional(),
    templateType: z.string().optional(),
    data: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export async function sendWhatsappTemplateHandler(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return ApiErrors.unauthorized();
    }

    const parsedBody = await parseJsonBody(request, sendTemplateSchema);
    if (!parsedBody.ok) return parsedBody.response;
    const { phone, phoneNumber, templateType, data } = parsedBody.data;

    const num = phoneNumber || phone;
    if (!num || !templateType) {
      return ApiErrors.validationError(
        "phone/phoneNumber and templateType are required",
      );
    }

    const payload = {
      phoneNumber: num,
      templateType,
      data: { ...(data || {}), phoneNumber: num },
    };

    const res = await fetch(`${WHATSAPP_SERVICE_URL}/api/whatsapp/send-template`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await res.json();

    if (res.ok && result.success && session.user?.id) {
      logAction(session.user.id, "whatsapp_sent", "WhatsApp", "template", {
        templateType,
        phone: num,
      }).catch(() => {});
    }

    if (!res.ok) {
      const errMsg =
        typeof result?.error === "string" ? result.error : "Failed to send";
      if (res.status === 401) return ApiErrors.unauthorized(errMsg);
      if (res.status === 403) return ApiErrors.forbidden(errMsg);
      if (res.status === 404) return ApiErrors.notFound("Resource");
      if (res.status === 400) return ApiErrors.validationError(errMsg);
      if (res.status >= 500) return ApiErrors.internal(errMsg);
      return NextResponse.json(
        { success: false, error: errMsg },
        { status: res.status },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    logger.error("[send-template] Error:", error as Error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    const isConnectionError =
      msg.includes("ECONNREFUSED") ||
      msg.includes("fetch failed") ||
      msg.includes("Failed to fetch");

    return NextResponse.json(
      {
        success: false,
        error: isConnectionError
          ? `${WHATSAPP_NOT_CONFIGURED} ${WHATSAPP_SETUP_HINT}`
          : msg,
      },
      { status: 503 },
    );
  }
}
