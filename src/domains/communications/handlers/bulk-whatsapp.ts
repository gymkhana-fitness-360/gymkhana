import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getGymContext, GymContextError } from "@/domains/tenancy";
import { getWhatsAppService } from "@/lib/whatsapp";
import { generateMessage, type MessageTemplate } from "@/lib/whatsapp-templates";
import { prisma } from "@/lib/prisma";
import { ApiErrors } from "@/lib/api-handler";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { WHATSAPP_NOT_CONFIGURED, WHATSAPP_SETUP_HINT } from "@/lib/messaging/whatsapp-copy";

const messageSchema = z.object({
  phoneNumber: z.string().min(5),
  message: z.string().min(1).optional(),
  template: z.string().optional(),
  templateData: z.record(z.string(), z.unknown()).optional(),
  customMessage: z.string().optional(),
  reminderId: z.string().optional(),
});

const bodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(50),
  delayMs: z.number().int().min(500).max(30000).optional(),
});

export async function bulkWhatsAppHandler(req: NextRequest): Promise<NextResponse> {
  try {
    await getGymContext(req);
    const parsed = await parseJsonBody(req, bodySchema);
    if (!parsed.ok) return parsed.response;

    const whatsapp = getWhatsAppService();
    let status = whatsapp.getStatus();
    if (!status.hasSession) {
      await whatsapp.initialize();
      status = whatsapp.getStatus();
    }
    if (!status.isAuthenticated) {
      const ok = await whatsapp.checkAuthentication();
      if (!ok) {
        return ApiErrors.unauthorized(
          `${WHATSAPP_NOT_CONFIGURED} ${WHATSAPP_SETUP_HINT}`
        );
      }
    }

    const processed = parsed.data.messages.map((msg) => {
      let finalMessage = msg.message ?? "";
      if (msg.template && msg.templateData) {
        finalMessage = generateMessage(
          msg.template as MessageTemplate,
          msg.templateData as never,
          msg.customMessage
        );
      }
      return {
        phoneNumber: msg.phoneNumber,
        message: finalMessage,
        reminderId: msg.reminderId,
      };
    });

    const delayMs = parsed.data.delayMs ?? 3000;
    const results = await whatsapp.sendBulkMessages(processed, delayMs);

    const successfulReminders = processed
      .filter((_, i) => i < results.success)
      .map((m) => m.reminderId)
      .filter(Boolean) as string[];

    if (successfulReminders.length > 0) {
      await prisma.reminder.updateMany({
        where: { id: { in: successfulReminders } },
        data: { status: "SENT", sentAt: new Date() },
      });
    }

    return NextResponse.json({
      success: true,
      sent: results.success,
      failed: results.failed,
      total: processed.length,
    });
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
