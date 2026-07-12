import { prisma } from "@/lib/prisma";
import { Prisma, PaymentMethod, PaymentStatus, PaymentSource } from "@prisma/client";
import { logAction } from "@/lib/audit-logger";
import { createLogger } from "@/lib/logger";
import { PAYMENT_RULES } from "@/domains/payments/rules";

const logger = createLogger("undo-stack");

export const UNDO_TTL_MS = PAYMENT_RULES.UNDO_DELETE_TTL_MS;
export const UNDO_SNAPSHOT_VERSION = 1 as const;

export type PaymentDeleteUndoSnapshot = {
  version: typeof UNDO_SNAPSHOT_VERSION;
  type: "payment_delete";
  expiresAt: string;
  gymId: string;
  memberId: string;
  memberName: string;
  payments: Array<Record<string, unknown>>;
  memberships: Array<Record<string, unknown>>;
  expectedPayments: Array<Record<string, unknown>>;
};

export type UndoStackItem = {
  auditLogId: string;
  type: "payment_delete";
  label: string;
  memberId: string;
  memberName: string;
  createdAt: string;
  expiresAt: string;
  deletedPaymentsCount: number;
  deletedMembershipsCount: number;
};

function parseDecimal(v: unknown): Prisma.Decimal {
  return new Prisma.Decimal(String(v));
}

function parseDate(v: unknown): Date {
  return new Date(String(v));
}

function isUndoSnapshot(details: unknown): details is { undoSnapshot: PaymentDeleteUndoSnapshot } {
  if (!details || typeof details !== "object") return false;
  const d = details as Record<string, unknown>;
  const s = d.undoSnapshot;
  return (
    !!s &&
    typeof s === "object" &&
    (s as PaymentDeleteUndoSnapshot).type === "payment_delete" &&
    (s as PaymentDeleteUndoSnapshot).version === UNDO_SNAPSHOT_VERSION
  );
}

function snapshotNotConsumed(details: unknown): boolean {
  if (!details || typeof details !== "object") return false;
  return (details as Record<string, unknown>).undoConsumed !== true;
}

export async function getLatestUndoableAction(gymId: string): Promise<UndoStackItem | null> {
  const since = new Date(Date.now() - UNDO_TTL_MS);
  const logs = await prisma.auditLog.findMany({
    where: {
      gymId,
      action: "payment_deleted",
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  for (const log of logs) {
    if (!snapshotNotConsumed(log.details) || !isUndoSnapshot(log.details)) continue;
    const snap = log.details.undoSnapshot;
    if (new Date(snap.expiresAt).getTime() < Date.now()) continue;

    const count = snap.payments.length;
    const memCount = snap.memberships.length;
    return {
      auditLogId: log.id,
      type: "payment_delete",
      label: `Restore payment · ${snap.memberName}${count > 1 ? ` (+${count - 1} split)` : ""}${memCount > 0 ? ` · ${memCount} period(s)` : ""}`,
      memberId: snap.memberId,
      memberName: snap.memberName,
      createdAt: log.createdAt.toISOString(),
      expiresAt: snap.expiresAt,
      deletedPaymentsCount: count,
      deletedMembershipsCount: memCount,
    };
  }

  return null;
}

export async function restorePaymentDeleteUndo(
  auditLogId: string,
  gymId: string,
  userId: string,
): Promise<{ memberId: string; restoredPayments: number; restoredMemberships: number }> {
  const log = await prisma.auditLog.findFirst({ where: { id: auditLogId, gymId } });
  if (!log || log.action !== "payment_deleted") {
    throw new Error("Undo record not found");
  }
  if (!snapshotNotConsumed(log.details) || !isUndoSnapshot(log.details)) {
    throw new Error("This delete was already undone or has no restore data");
  }

  const snap = log.details.undoSnapshot;
  if (snap.gymId !== gymId) {
    throw new Error("Undo record belongs to another gym");
  }
  if (new Date(snap.expiresAt).getTime() < Date.now()) {
    throw new Error("Undo window expired (30 minutes)");
  }

  const existingPay = await prisma.payment.findFirst({
    where: { id: { in: snap.payments.map((p) => String(p.id)) }, gymId },
    select: { id: true },
  });
  if (existingPay) {
    throw new Error("Payment already exists — cannot restore twice");
  }

  let restoredPayments = 0;
  let restoredMemberships = 0;

  await prisma.$transaction(async (tx) => {
    for (const raw of snap.memberships) {
      await tx.membership.create({
        data: {
          id: String(raw.id),
          gymId: String(raw.gymId ?? gymId),
          memberId: String(raw.memberId),
          planId: String(raw.planId),
          startDate: parseDate(raw.startDate),
          endDate: parseDate(raw.endDate),
          amount: parseDecimal(raw.amount),
          sourcePaymentId: raw.sourcePaymentId != null ? String(raw.sourcePaymentId) : null,
          lifecycleStatus: raw.lifecycleStatus as never,
          previousMembershipId:
            raw.previousMembershipId != null ? String(raw.previousMembershipId) : null,
          createdAt: raw.createdAt ? parseDate(raw.createdAt) : undefined,
        },
      });
      restoredMemberships++;
    }

    for (const raw of snap.payments) {
      await tx.payment.create({
        data: {
          id: String(raw.id),
          gymId: String(raw.gymId ?? gymId),
          memberId: String(raw.memberId),
          amount: parseDecimal(raw.amount),
          method: raw.method as PaymentMethod,
          status: raw.status as PaymentStatus,
          reference: raw.reference != null ? String(raw.reference) : null,
          notes: raw.notes != null ? String(raw.notes) : null,
          receivedById: String(raw.receivedById),
          receivedAt: parseDate(raw.receivedAt),
          paymentDate: raw.paymentDate ? parseDate(raw.paymentDate) : null,
          planId: raw.planId != null ? String(raw.planId) : null,
          duration: raw.duration != null ? String(raw.duration) : null,
          source: raw.source != null ? (raw.source as PaymentSource) : null,
          createdAt: raw.createdAt ? parseDate(raw.createdAt) : undefined,
          friendsFamilyDiscount: Boolean(raw.friendsFamilyDiscount),
          isPersonalTrainer: Boolean(raw.isPersonalTrainer),
          monthlyRate: raw.monthlyRate != null ? parseDecimal(raw.monthlyRate) : null,
          packageDuration: raw.packageDuration != null ? String(raw.packageDuration) : null,
          specialOccasion: raw.specialOccasion != null ? String(raw.specialOccasion) : null,
          studentGymfloPlan: Boolean(raw.studentGymfloPlan ?? raw.studentGymbroPlan),
          month: typeof raw.month === "number" ? raw.month : null,
          year: typeof raw.year === "number" ? raw.year : null,
          billSentAt: raw.billSentAt ? parseDate(raw.billSentAt) : null,
          billId: raw.billId != null ? String(raw.billId) : null,
        },
      });
      restoredPayments++;
    }

    for (const raw of snap.expectedPayments) {
      await tx.expectedPayment.update({
        where: { id: String(raw.id) },
        data: {
          membershipId: raw.membershipId != null ? String(raw.membershipId) : null,
          paymentId: raw.paymentId != null ? String(raw.paymentId) : null,
        },
      });
    }

    const prev = (log.details ?? {}) as Record<string, unknown>;
    await tx.auditLog.update({
      where: { id: auditLogId },
      data: {
        details: {
          ...prev,
          undoConsumed: true,
          undoConsumedAt: new Date().toISOString(),
          undoConsumedBy: userId,
        },
      },
    });
  }, { maxWait: 10000, timeout: 30000 });

  await logAction(userId, "payment_created", "Payment", String(snap.payments[0]?.id), {
    gymId,
    memberId: snap.memberId,
    memberName: snap.memberName,
    restoredFromAuditLogId: auditLogId,
    restoredPayments,
    restoredMemberships,
    source: "undo_payment_delete",
  });

  logger.info(
    `Restored payment delete undo ${auditLogId}: ${restoredPayments} payments, ${restoredMemberships} memberships`,
  );

  return { memberId: snap.memberId, restoredPayments, restoredMemberships };
}
