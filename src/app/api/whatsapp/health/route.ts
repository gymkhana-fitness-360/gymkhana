import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isMetaWabaConfigured } from "@/lib/whatsapp/meta-cloud";
import {
  WHATSAPP_NOT_CONFIGURED,
  WHATSAPP_SETUP_HINT,
} from "@/lib/messaging/whatsapp-copy";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";

/**
 * Health check for WhatsApp Business messaging (Meta Cloud API).
 */
export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session) {
      return ApiErrors.unauthorized();
    }

    if (isMetaWabaConfigured()) {
      return NextResponse.json({
        status: "ok",
        provider: "meta_waba",
        message: "WhatsApp Business API is configured.",
      });
    }

    return NextResponse.json(
      {
        status: "error",
        provider: "none",
        message: `${WHATSAPP_NOT_CONFIGURED} ${WHATSAPP_SETUP_HINT}`,
      },
      { status: 503 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error ? error.message : "Messaging service unavailable",
      },
      { status: 503 }
    );
  }
}
