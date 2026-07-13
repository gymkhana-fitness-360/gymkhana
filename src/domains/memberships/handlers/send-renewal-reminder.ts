import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getGymContext, GymContextError } from "@/domains/tenancy";
import { getWhatsAppDirectMessaging } from "@/domains/communications/send-port";
import { prisma } from "@/lib/prisma";
import { ApiErrors } from "@/lib/api-handler";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { formatSimpleReminderMessage } from "@/lib/templates/reminder-simple";
import { formatDate } from "@/lib/utils";
import { logAction } from "@/lib/audit-logger";
import { recordCommunicationEvent } from "@/domains/communications/communication-ledger";
import { toDateOnlyIST, daysFromTodayIST } from "@/lib/date-only";
import { auth } from "@/lib/auth";
import { refreshGoalRecovery, getActiveGoal } from "@/domains/goals/service";

const bodySchema = z.object({
  memberId: z.string().min(1),
  membershipId: z.string().min(1).optional(),
  /** Client must pass true after explicit user confirm (GYM-OS-B-004). */
  confirmed: z.literal(true),
});

export async function sendRenewalReminderHandler(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const { gymId } = await getGymContext(request);
    const session = await auth();
    if (!session?.user?.id) return ApiErrors.unauthorized();

    const parsed = await parseJsonBody(request, bodySchema);
    if (!parsed.ok) return parsed.response;

    const membership = await prisma.membership.findFirst({
      where: {
        gymId,
        ...(parsed.data.membershipId
          ? { id: parsed.data.membershipId }
          : { memberId: parsed.data.memberId }),
      },
      include: {
        Member: { select: { id: true, name: true, phone: true } },
        Plan: { select: { name: true } },
      },
      orderBy: { endDate: "desc" },
    });

    if (!membership) return ApiErrors.notFound("Membership");

    const endDate = toDateOnlyIST(membership.endDate);
    const daysUntil = -daysFromTodayIST(endDate);
    const daysOverdue = daysUntil < 0 ? Math.abs(daysUntil) : undefined;

    const message = await formatSimpleReminderMessage({
      name: membership.Member.name,
      expiryDate: formatDate(membership.endDate),
      daysLeft: daysUntil,
      daysOverdue,
      planName: membership.Plan?.name,
      phoneNumber: membership.Member.phone,
      gymId,
    });

    const phone = membership.Member.phone?.replace(/\D/g, "") || "";
    if (!phone || phone.length < 10) {
      return ApiErrors.validationError("Invalid phone number");
    }

    const reminderType = daysOverdue ? "OVERDUE" : "RENEWAL";

    const messaging = getWhatsAppDirectMessaging();
    const result = await messaging.sendDirect({
      phoneNumber: phone,
      message,
      template: "reminder",
      templateData: {
        name: membership.Member.name,
        expiryDate: formatDate(membership.endDate),
        daysLeft: daysUntil,
        programType: "Gym",
        phoneNumber: phone,
      },
    });

    const event = await recordCommunicationEvent({
      gymId,
      memberId: membership.Member.id,
      channel: "WHATSAPP",
      direction: "OUTBOUND",
      templateId: reminderType,
      message,
      status: result.success ? "SENT" : "FAILED",
      provider: "whatsapp",
    });

    if (result.success) {
      logAction(session.user.id, "reminder_sent", "CommunicationEvent", event.id, {
        member: membership.Member.name,
      }).catch(() => {});

      const activeGoal = await getActiveGoal(gymId);
      if (activeGoal) {
        await refreshGoalRecovery(gymId, activeGoal.id);
      }

      return NextResponse.json({
        success: true,
        message: `Reminder sent to ${membership.Member.name}`,
        communicationEventId: event.id,
      });
    }

    return ApiErrors.internal(result.error || "Failed to send reminder");
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
