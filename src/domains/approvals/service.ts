import { prisma } from "@/lib/prisma";
import { getWhatsAppDirectMessaging } from "@/domains/communications/send-port";
import { recordCommunicationEvent } from "@/domains/communications/communication-ledger";
import { refreshGoalRecovery, getActiveGoal } from "@/domains/goals/service";
import { publishDomainEvent } from "@/lib/platform/outbox";

type SendReminderPayload = {
  memberId: string;
  membershipId?: string;
  message: string;
  phoneNumber: string;
  templateId?: string;
};

export async function listPendingApprovals(gymId: string) {
  return prisma.approval.findMany({
    where: { gymId, status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: 50,
  });
}

export async function createSendReminderApproval(
  gymId: string,
  createdById: string,
  payload: SendReminderPayload,
) {
  return prisma.approval.create({
    data: {
      gymId,
      type: "SEND_REMINDER",
      status: "PENDING",
      payload,
      createdById,
    },
  });
}

async function executeSendReminder(gymId: string, payload: SendReminderPayload) {
  const messaging = getWhatsAppDirectMessaging();
  const result = await messaging.sendDirect({
    phoneNumber: payload.phoneNumber.replace(/\D/g, ""),
    message: payload.message,
    template: "reminder",
    templateData: {
      name: "Member",
      phoneNumber: payload.phoneNumber,
    },
  });

  const event = await recordCommunicationEvent({
    gymId,
    memberId: payload.memberId,
    channel: "WHATSAPP",
    direction: "OUTBOUND",
    templateId: payload.templateId ?? "RENEWAL",
    message: payload.message,
    status: result.success ? "SENT" : "FAILED",
    provider: "whatsapp",
  });

  if (result.success) {
    await publishDomainEvent(
      "communication.sent",
      {
        memberId: payload.memberId,
        communicationEventId: event.id,
        channel: "WHATSAPP",
      },
      gymId,
    );
  }

  return result;
}

export async function decideApproval(
  gymId: string,
  approvalId: string,
  decision: "APPROVED" | "REJECTED",
  decidedById: string,
) {
  const approval = await prisma.approval.findFirst({
    where: { id: approvalId, gymId, status: "PENDING" },
  });
  if (!approval) return null;

  if (decision === "REJECTED") {
    return prisma.approval.update({
      where: { id: approvalId },
      data: {
        status: "REJECTED",
        decidedById,
        decidedAt: new Date(),
      },
    });
  }

  const payload = approval.payload as SendReminderPayload;
  const sendResult = await executeSendReminder(gymId, payload);

  const updated = await prisma.approval.update({
    where: { id: approvalId },
    data: {
      status: sendResult.success ? "EXECUTED" : "FAILED",
      decidedById,
      decidedAt: new Date(),
      executedAt: new Date(),
      error: sendResult.success ? null : sendResult.error ?? "Send failed",
    },
  });

  const activeGoal = await getActiveGoal(gymId);
  if (activeGoal) {
    await refreshGoalRecovery(gymId, activeGoal.id);
  }

  return { approval: updated, sendResult };
}
