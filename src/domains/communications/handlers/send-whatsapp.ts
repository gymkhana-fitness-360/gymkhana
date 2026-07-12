import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getGymContext, GymContextError } from "@/domains/tenancy";
import type { IWhatsAppDirectMessaging } from "../interfaces";
import type { SendWhatsAppDirectResultDTO } from "../types";
import { ApiErrors } from "@/lib/api-handler";
import { recordCommunicationEvent } from "@/domains/communications/communication-ledger";

const bodySchema = z.object({
  phoneNumber: z.string().min(5).max(32),
  message: z.string().min(1).max(8000),
  reminderId: z.string().min(1).optional(),
  template: z.string().min(1).optional(),
  templateData: z.record(z.string(), z.unknown()).optional(),
});

export async function sendWhatsAppHandler(
  req: NextRequest,
  messaging: IWhatsAppDirectMessaging
): Promise<NextResponse<SendWhatsAppDirectResultDTO | { error: string }>> {
  try {
    const { gymId } = await getGymContext(req);
    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return ApiErrors.validationError("Validation failed", parsed.error.issues);
    }
    const { template, templateData, reminderId, ...rest } = parsed.data;
    const result = await messaging.sendDirect({
      ...rest,
      gymId,
      reminderId,
      template,
      templateData,
    });

    if (gymId) {
      await recordCommunicationEvent({
        gymId,
        channel: "WHATSAPP",
        direction: "OUTBOUND",
        templateId: template ?? null,
        message: rest.message,
        status: result.success ? "SENT" : "FAILED",
        provider: "whatsapp",
        legacySource: reminderId ? "reminder" : null,
        legacyId: reminderId ?? null,
      });
    }

    const status = result.success ? 200 : 502;
    return NextResponse.json(result, { status });
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
