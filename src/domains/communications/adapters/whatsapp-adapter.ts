import { getWhatsAppService } from "@/lib/whatsapp";
import { generateMessage, type MessageTemplate } from "@/lib/whatsapp-templates";
import { prisma } from "@/lib/prisma";
import {
  WHATSAPP_NOT_CONFIGURED,
  WHATSAPP_SEND_UNAVAILABLE,
  WHATSAPP_SETUP_HINT,
} from "@/lib/messaging/whatsapp-copy";
import type { IWhatsAppDirectMessaging } from "../interfaces";
import type {
  SendWhatsAppDirectInputDTO,
  SendWhatsAppDirectResultDTO,
} from "../types";

/**
 * Legacy browser-session fallback when Meta Cloud API is not configured.
 * Prefer {@link RoutingWhatsAppAdapter} for production messaging.
 */
export class WhatsAppAdapter implements IWhatsAppDirectMessaging {
  async sendDirect(
    input: SendWhatsAppDirectInputDTO
  ): Promise<SendWhatsAppDirectResultDTO> {
    try {
      const whatsapp = getWhatsAppService();
      let status = whatsapp.getStatus();
      if (!status.hasSession) {
        await whatsapp.initialize();
        status = whatsapp.getStatus();
      }
      if (!status.isAuthenticated) {
        const ok = await whatsapp.checkAuthentication();
        if (!ok) {
          return {
            success: false,
            error: `${WHATSAPP_NOT_CONFIGURED} ${WHATSAPP_SETUP_HINT}`,
          };
        }
      }
      let finalMessage = input.message;
      if (input.template && input.templateData) {
        finalMessage = generateMessage(
          input.template as MessageTemplate,
          input.templateData as never
        );
      }
      const sent = await whatsapp.sendMessage(input.phoneNumber, finalMessage);
      if (sent && input.reminderId) {
        await prisma.reminder.update({
          where: { id: input.reminderId },
          data: { status: "SENT", sentAt: new Date() },
        });
      }
      return sent
        ? { success: true }
        : { success: false, error: WHATSAPP_SEND_UNAVAILABLE };
    } catch (e) {
      return {
        success: false,
        error: WHATSAPP_SEND_UNAVAILABLE,
      };
    }
  }
}
