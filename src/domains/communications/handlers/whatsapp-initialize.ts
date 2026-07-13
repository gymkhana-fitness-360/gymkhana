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

export async function whatsappInitializeHandler() {
  try {
    const session = await auth();
    if (!session) {
      return ApiErrors.unauthorized();
    }

    if (!isMetaWabaConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: WHATSAPP_NOT_CONFIGURED,
          message: WHATSAPP_SETUP_HINT,
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      success: true,
      isAuthenticated: true,
      message: "WhatsApp Business API is configured and ready to send messages.",
    });
  } catch (error) {
    logger.error("Error initializing WhatsApp:", error as Error);
    return ApiErrors.internal(
      error instanceof Error ? error.message : "Failed to verify WhatsApp Business API",
    );
  }
}
