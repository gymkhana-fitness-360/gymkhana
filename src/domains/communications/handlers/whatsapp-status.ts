import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isMetaWabaConfigured } from "@/lib/whatsapp/meta-cloud";
import { createLogger } from "@/lib/logger";
import { ApiErrors } from "@/lib/api-handler";
import {
  WHATSAPP_NOT_CONFIGURED,
  WHATSAPP_SETUP_HINT,
} from "@/lib/messaging/whatsapp-copy";

const logger = createLogger("api-whatsapp");

export async function whatsappStatusHandler() {
  try {
    const session = await auth();
    if (!session) {
      return ApiErrors.unauthorized();
    }

    const configured = isMetaWabaConfigured();

    return NextResponse.json({
      success: true,
      isAuthenticated: configured,
      hasSession: configured,
      provider: configured ? "meta_waba" : "none",
      message: configured
        ? "WhatsApp Business API is configured."
        : `${WHATSAPP_NOT_CONFIGURED} ${WHATSAPP_SETUP_HINT}`,
    });
  } catch (error) {
    logger.error("Error getting WhatsApp status:", error as Error);
    return ApiErrors.internal(
      error instanceof Error ? error.message : "Failed to get WhatsApp status",
    );
  }
}
