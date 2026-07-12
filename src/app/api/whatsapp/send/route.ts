import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { createLogger } from "@/lib/logger";
import { ApiErrors, getErrorMessage } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { sendWhatsAppHandler } from "@/domains/communications/handlers/send-whatsapp";
import { getWhatsAppDirectMessaging } from "@/domains/communications/adapters";

const logger = createLogger("api-whatsapp");

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "whatsappSend");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session?.user) {
      return ApiErrors.unauthorized();
    }

    const role = session.user.role;
    if (role !== "ADMIN" && role !== "SUB_ADMIN") {
      return ApiErrors.forbidden();
    }

    const response = await sendWhatsAppHandler(request, getWhatsAppDirectMessaging());
    const result = await response.json();
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return ApiErrors.unauthorized(
          "error" in result && result.error
            ? String(result.error)
            : "WhatsApp not authenticated"
        );
      }
      if (response.status === 400) {
        return ApiErrors.validationError(
          "error" in result ? String(result.error) : "Invalid request"
        );
      }
      return successResponse({
        sent: false,
        message: "error" in result ? String(result.error) : "Failed to send message",
      });
    }

    return successResponse({
      sent: result.success,
      message: result.success ? "Message sent successfully" : (result.error ?? "Failed to send message"),
    });
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logger.error("WhatsApp send error:", error as Error);
    return ApiErrors.internal(errorMessage);
  }
}
