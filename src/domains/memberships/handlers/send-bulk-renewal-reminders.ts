import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getGymContext, GymContextError } from "@/domains/tenancy";
import { getWhatsAppDirectMessaging } from "@/domains/communications/send-port";
import { prisma } from "@/lib/prisma";
import { ApiErrors } from "@/lib/api-handler";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { buildRenewalReminderDraft } from "@/domains/memberships/renewal-reminder-draft";
import { logAction } from "@/lib/audit-logger";
import { recordCommunicationEvent } from "@/domains/communications/communication-ledger";
import { auth } from "@/lib/auth";

const previewSchema = z.object({
  memberIds: z.array(z.string().min(1)).min(1).max(100),
  previewOnly: z.literal(true),
});

const sendSchema = z.object({
  memberIds: z.array(z.string().min(1)).min(1).max(100),
  confirmed: z.literal(true),
});

const bodySchema = z.union([previewSchema, sendSchema]);

export async function sendBulkRenewalRemindersHandler(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const { gymId } = await getGymContext(request);
    const session = await auth();
    if (!session?.user?.id) return ApiErrors.unauthorized();

    const parsed = await parseJsonBody(request, bodySchema);
    if (!parsed.ok) return parsed.response;

    const memberships = await prisma.membership.findMany({
      where: { gymId, memberId: { in: parsed.data.memberIds } },
      include: {
        Member: { select: { id: true, name: true, phone: true } },
        Plan: { select: { name: true } },
      },
      orderBy: { endDate: "desc" },
      distinct: ["memberId"],
    });

    const drafts = await Promise.all(
      memberships.map(async (membership) => {
        const built = await buildRenewalReminderDraft({
          gymId,
          memberName: membership.Member.name,
          memberPhone: membership.Member.phone ?? "",
          endDate: membership.endDate,
          planName: membership.Plan?.name,
        });
        return {
          memberId: membership.Member.id,
          memberName: membership.Member.name,
          membershipId: membership.id,
          phoneNumber: built.phone,
          validPhone: built.validPhone,
          message: built.message,
          reminderType: built.reminderType,
        };
      }),
    );

    if ("previewOnly" in parsed.data && parsed.data.previewOnly) {
      return NextResponse.json({
        preview: true,
        total: drafts.length,
        drafts,
      });
    }

    const messaging = getWhatsAppDirectMessaging();
    let successCount = 0;
    const errors: string[] = [];
    const communicationEventIds: string[] = [];

    for (let i = 0; i < drafts.length; i++) {
      const draft = drafts[i]!;
      if (!draft.validPhone) {
        errors.push(`${draft.memberName}: Invalid phone`);
        continue;
      }

      const result = await messaging.sendDirect({
        phoneNumber: draft.phoneNumber,
        message: draft.message,
        template: "reminder",
        templateData: {
          name: draft.memberName,
          phoneNumber: draft.phoneNumber,
        },
      });

      const event = await recordCommunicationEvent({
        gymId,
        memberId: draft.memberId,
        channel: "WHATSAPP",
        direction: "OUTBOUND",
        templateId: draft.reminderType,
        message: draft.message,
        status: result.success ? "SENT" : "FAILED",
        provider: "whatsapp",
      });

      if (result.success) {
        successCount++;
        communicationEventIds.push(event.id);
      } else {
        errors.push(`${draft.memberName}: ${result.error}`);
      }

      if (i < drafts.length - 1) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    if (successCount > 0) {
      logAction(session.user.id, "reminder_sent", "CommunicationEvent", "bulk", {
        bulk: true,
        sent: successCount,
        total: drafts.length,
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      total: drafts.length,
      sent: successCount,
      failed: drafts.length - successCount,
      communicationEventIds,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
