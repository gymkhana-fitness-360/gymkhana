import {
  isMetaWabaConfigured,
  sendMetaWabaText,
} from "@/lib/whatsapp/meta-cloud";
import { prisma } from "@/lib/prisma";
import { generateMessage, type MessageTemplate } from "@/lib/whatsapp-templates";
import type { IWhatsAppDirectMessaging } from "../interfaces";
import type {
  SendWhatsAppDirectInputDTO,
  SendWhatsAppDirectResultDTO,
} from "../types";
import { WhatsAppAdapter } from "./whatsapp-adapter";

/**
 * Sends via Meta Cloud API when configured (global or per-gym wabaEnabled setting).
 */
export class RoutingWhatsAppAdapter implements IWhatsAppDirectMessaging {
  private fallback = new WhatsAppAdapter();

  private async isWabaEnabledForGym(gymId?: string): Promise<boolean> {
    if (!isMetaWabaConfigured()) return false;
    if (process.env.META_WABA_FORCE === "1") return true;
    if (!gymId) return true;
    const row = await prisma.setting.findFirst({
      where: { key: `wabaEnabled:${gymId}` },
    });
    return row?.value === "true";
  }

  async sendDirect(
    input: SendWhatsAppDirectInputDTO & { gymId?: string },
  ): Promise<SendWhatsAppDirectResultDTO> {
    let finalMessage = input.message;
    if (input.template && input.templateData) {
      finalMessage = generateMessage(
        input.template as MessageTemplate,
        input.templateData as never,
      );
    }

    const gymId = input.gymId;
    if (await this.isWabaEnabledForGym(gymId)) {
      const result = await sendMetaWabaText(input.phoneNumber, finalMessage);
      if (result.ok) {
        if (input.reminderId) {
          await prisma.reminder.update({
            where: { id: input.reminderId },
            data: { status: "SENT", sentAt: new Date() },
          });
        }
        return { success: true };
      }
      if (result.reason !== "not_configured") {
        return { success: false, error: result.reason };
      }
    }

    return this.fallback.sendDirect({ ...input, message: finalMessage });
  }
}
