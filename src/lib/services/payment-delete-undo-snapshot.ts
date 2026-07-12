import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  UNDO_SNAPSHOT_VERSION,
  UNDO_TTL_MS,
  type PaymentDeleteUndoSnapshot,
} from "@/lib/services/undo-stack.service";

function serializeDecimal(v: Prisma.Decimal | null | undefined): string | null {
  if (v == null) return null;
  return v.toString();
}

function serializeDate(v: Date | null | undefined): string | null {
  if (v == null) return null;
  return v.toISOString();
}

export async function buildPaymentDeleteUndoSnapshot(
  paymentId: string,
  gymId: string,
  memberName: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<PaymentDeleteUndoSnapshot> {
  const payment = await db.payment.findFirst({ where: { id: paymentId, gymId } });
  if (!payment) {
    throw new Error(`Payment ${paymentId} not found for undo snapshot`);
  }

  const memberships = await db.membership.findMany({
    where: { gymId, OR: [{ sourcePaymentId: paymentId }, { memberId: payment.memberId }] },
  });

  const linkedMemberships = memberships.filter(
    (m) => m.sourcePaymentId === paymentId || memberships.length <= 3,
  );

  const membershipIds = linkedMemberships.map((m) => m.id);
  const expectedPayments = await db.expectedPayment.findMany({
    where: {
      gymId,
      OR: [{ paymentId }, ...(membershipIds.length ? [{ membershipId: { in: membershipIds } }] : [])],
    },
  });

  return {
    version: UNDO_SNAPSHOT_VERSION,
    type: "payment_delete",
    expiresAt: new Date(Date.now() + UNDO_TTL_MS).toISOString(),
    gymId,
    memberId: payment.memberId,
    memberName,
    payments: [
      {
        id: payment.id,
        gymId: payment.gymId,
        memberId: payment.memberId,
        amount: serializeDecimal(payment.amount),
        method: payment.method,
        status: payment.status,
        reference: payment.reference,
        notes: payment.notes,
        receivedById: payment.receivedById,
        receivedAt: serializeDate(payment.receivedAt),
        paymentDate: serializeDate(payment.paymentDate),
        planId: payment.planId,
        duration: payment.duration,
        source: payment.source,
        createdAt: serializeDate(payment.createdAt),
        friendsFamilyDiscount: payment.friendsFamilyDiscount,
        isPersonalTrainer: payment.isPersonalTrainer,
        monthlyRate: serializeDecimal(payment.monthlyRate),
        packageDuration: payment.packageDuration,
        specialOccasion: payment.specialOccasion,
        studentGymfloPlan: payment.studentGymfloPlan,
        month: payment.month,
        year: payment.year,
        billSentAt: serializeDate(payment.billSentAt),
        billId: payment.billId,
      },
    ],
    memberships: linkedMemberships.map((m) => ({
      id: m.id,
      gymId: m.gymId,
      memberId: m.memberId,
      planId: m.planId,
      startDate: serializeDate(m.startDate),
      endDate: serializeDate(m.endDate),
      amount: serializeDecimal(m.amount),
      sourcePaymentId: m.sourcePaymentId,
      lifecycleStatus: m.lifecycleStatus,
      previousMembershipId: m.previousMembershipId,
      createdAt: serializeDate(m.createdAt),
    })),
    expectedPayments: expectedPayments.map((e) => ({
      id: e.id,
      gymId: e.gymId,
      memberId: e.memberId,
      membershipId: e.membershipId,
      billId: e.billId,
      dueDate: serializeDate(e.dueDate),
      amount: serializeDecimal(e.amount),
      status: e.status,
      paymentId: e.paymentId,
      reminderSent: e.reminderSent,
      reminderSentAt: serializeDate(e.reminderSentAt),
      notes: e.notes,
      createdAt: serializeDate(e.createdAt),
      updatedAt: serializeDate(e.updatedAt),
    })),
  };
}
