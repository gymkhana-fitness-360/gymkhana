"use strict";

import { prisma } from "@/lib/prisma";
import {
  PaymentMethod,
  Payment,
  Membership,
  PaymentStatus,
  Prisma,
} from "@prisma/client";
import { toDateOnlyIST, addDaysIST, calendarDaysApartIST } from "@/lib/date-only";
import { BUSINESS_RULES, shouldMergePaymentDuplicates } from "@/lib/business-rules";
import { validatePaymentCreateContext, BusinessRuleViolation } from "@/lib/crud-business-validation";
import { createOrExtendMembership } from "./membership.service";
import { resolveOverdueOnPayment } from "@/domains/collections/services/overdue.service";
import { logAction } from "@/lib/audit-logger";
import { createLogger } from "@/lib/logger";
import { inferPlanFromAmount } from "./plan-inference";

const logger = createLogger("lib-services");

type DbClient = Prisma.TransactionClient | typeof prisma;

/**
 * PAYMENT SERVICE
 *
 * Centralized payment processing logic.
 * Handles duplicate detection, membership creation, and overdue resolution.
 */

export interface CreatePaymentInput {
  memberId: string;
  gymId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: Date;
  planId: string;
  duration?: string | null;
  userId: string;
  notes?: string;
  /** Persist payment only (no membership renewal / extension). */
  recordOnly?: boolean;
  reference?: string | null;
  status?: PaymentStatus;
  packageDuration?: string | null;
  isPersonalTrainer?: boolean;
  friendsFamilyDiscount?: boolean;
  monthlyRate?: number | null;
  studentGymfloPlan?: boolean;
  specialOccasion?: string | null;
}

export interface CreatePaymentOptions {
  /** Use when payment is part of a larger transaction (e.g. new member signup). */
  tx?: Prisma.TransactionClient;
}

export interface PaymentResult {
  payment: Payment;
  membership: Membership | null;
  wasExtended: boolean;
  isDuplicate: boolean;
}

/**
 * Check for duplicate payments
 */
export async function checkDuplicatePayment(
  memberId: string,
  gymId: string,
  amount: number,
  paymentDate: Date,
  db: DbClient = prisma
): Promise<{ isDuplicate: boolean; existingPayment?: Payment }> {
  const dateOnly = toDateOnlyIST(paymentDate);
  const span = BUSINESS_RULES.PAYMENT.DUPLICATE_IST_CALENDAR_DAY_SPAN;
  const windowStart = addDaysIST(dateOnly, -span);
  const windowEnd = addDaysIST(dateOnly, span);

  const existingPayments = await db.payment.findMany({
    where: {
      memberId,
      gymId,
      OR: [
        { receivedAt: { gte: windowStart, lte: windowEnd } },
        { paymentDate: { gte: windowStart, lte: windowEnd } },
      ],
    },
    orderBy: {
      receivedAt: "desc",
    },
  });

  for (const existing of existingPayments) {
    if (calendarDaysApartIST(dateOnly, existing.receivedAt) > span) {
      continue;
    }
    if (shouldMergePaymentDuplicates(amount, Number(existing.amount))) {
      return { isDuplicate: true, existingPayment: existing };
    }
  }

  return { isDuplicate: false };
}

/**
 * Create payment and associated membership (unless recordOnly).
 */
export async function createPayment(
  input: CreatePaymentInput,
  options?: CreatePaymentOptions
): Promise<PaymentResult> {
  const {
    memberId,
    gymId,
    amount,
    paymentMethod,
    paymentDate,
    planId,
    duration,
    userId,
    notes,
    recordOnly = false,
    reference,
    status: statusInput,
    packageDuration,
    isPersonalTrainer,
    friendsFamilyDiscount,
    monthlyRate,
    studentGymfloPlan,
    specialOccasion,
  } = input;

  const statusResolved = statusInput ?? PaymentStatus.COMPLETED;

  const { calendarDate: dateOnly } = validatePaymentCreateContext({
    amount,
    paymentDate,
    allowBelowMinimumAmount:
      statusResolved === PaymentStatus.FAILED ||
      statusResolved === PaymentStatus.PENDING,
  });

  const runWrite = async (db: DbClient): Promise<Omit<PaymentResult, "isDuplicate">> => {
    const memberRow = await db.member.findUnique({
      where: { id: memberId },
      select: { gymId: true },
    });
    if (!memberRow) {
      throw new Error("Member not found for payment");
    }
    if (memberRow.gymId !== gymId) {
      throw new Error("Gym mismatch for member payment");
    }

    const duplicateCheck = await checkDuplicatePayment(
      memberId,
      gymId,
      amount,
      paymentDate,
      db
    );
    if (duplicateCheck.isDuplicate && duplicateCheck.existingPayment) {
      logger.warn(
        `[PAYMENT] Duplicate detected for member ${memberId}, amount ₹${amount}, date ${paymentDate.toISOString()}`
      );

      throw new BusinessRuleViolation(
        "PAYMENT_DUPLICATE",
        JSON.stringify({
          message: "Possible duplicate payment detected",
          existingPayment: {
            id: duplicateCheck.existingPayment.id,
            amount: Number(duplicateCheck.existingPayment.amount),
            receivedAt: duplicateCheck.existingPayment.receivedAt.toISOString(),
            method: duplicateCheck.existingPayment.method,
          },
          canOverride: true,
        })
      );
    }

    const payment = await db.payment.create({
      data: {
        memberId,
        gymId,
        amount,
        method: paymentMethod,
        receivedById: userId,
        receivedAt: dateOnly,
        paymentDate: dateOnly,
        planId,
        duration,
        notes,
        reference: reference ?? undefined,
        status: statusResolved,
        packageDuration: packageDuration ?? undefined,
        isPersonalTrainer: isPersonalTrainer ?? false,
        friendsFamilyDiscount: friendsFamilyDiscount ?? false,
        monthlyRate: monthlyRate != null ? monthlyRate : undefined,
        studentGymfloPlan: studentGymfloPlan ?? false,
        specialOccasion: specialOccasion ?? undefined,
        month: dateOnly.getMonth() + 1,
        year: dateOnly.getFullYear(),
      },
    });

    let membership: Membership | null = null;
    let wasExtended = false;

    if (!recordOnly) {
      // GUARD: PENDING/FAILED payments should not create memberships
      // These require manual review and confirmation before activating membership
      if (statusResolved === PaymentStatus.PENDING || statusResolved === PaymentStatus.FAILED) {
        logger.warn(
          `[PAYMENT] ${statusResolved} payment ${payment.id} created without membership - requires manual review`
        );
        
        // Flag for review in audit log
        await logAction(userId, "payment_pending_review", "Payment", payment.id, {
          status: statusResolved,
          requiresReview: true,
          memberId,
          amount,
          reason: statusResolved === PaymentStatus.PENDING 
            ? "Payment pending confirmation" 
            : "Payment failed - needs investigation",
        });
      } else {
        // Only COMPLETED/REFUNDED payments create memberships
        // BUSINESS RULE: If planId is missing or invalid (duration string), infer from amount
        // This ensures memberships are always created for payments
        // Duration strings like "1 Month Renewal", "New Admission" are NOT valid planIds
        const invalidPlanIdPatterns = [
          /renewal/i, /admission/i, /month/i, /monthly/i, /quarterly/i, 
          /yearly/i, /annual/i, /days?$/i
        ];
        const isInvalidPlanId = !planId || invalidPlanIdPatterns.some(p => p.test(planId));
        
        let resolvedPlanId = planId;
        let resolvedDuration = duration;
        
        if (isInvalidPlanId) {
          const inferred = inferPlanFromAmount(amount);
          resolvedPlanId = inferred.planId;
          resolvedDuration = duration || `${inferred.durationDays} days`;
          
          logger.info(
            `[PAYMENT] planId "${planId}" is invalid/missing, inferred ${inferred.planId} from amount ₹${amount}`
          );
        }

        const membershipResult = await createOrExtendMembership(
          {
            memberId,
            gymId,
            planId: resolvedPlanId,
            amount,
            paymentDate: dateOnly,
            duration: resolvedDuration,
            userId,
            sourcePaymentId: payment.id,
          },
          db as Prisma.TransactionClient
        );
        membership = membershipResult.membership;
        wasExtended = membershipResult.wasExtended;
      }
    }

    // Log action asynchronously without blocking (fire and forget)
    logAction(userId, "payment_created", "Payment", payment.id, {
      gymId,
      memberId,
      amount,
      paymentMethod,
      paymentDate: payment.paymentDate
        ? payment.paymentDate.toISOString().split("T")[0]
        : payment.receivedAt.toISOString().split("T")[0],
      planId,
      recordOnly,
    }).catch((err) => logger.error("Audit log error:", err));

    return { payment, membership, wasExtended };
  };

  if (options?.tx) {
    const r = await runWrite(options.tx);
    
    // CRITICAL FIX: Resolve overdue even with external transactions
    // Queue for after transaction commits using setImmediate
    if (!recordOnly && BUSINESS_RULES.PAYMENT.AUTO_RESOLVE_OVERDUE) {
      setImmediate(() => {
        resolveOverdueOnPayment(memberId, gymId).catch((error) => {
          logger.error(
            `[PAYMENT] Failed to resolve overdue for member ${memberId} after external tx`,
            error instanceof Error ? error : new Error(String(error))
          );
        });
      });
    }
    
    return { ...r, isDuplicate: false };
  }

  const r = await prisma.$transaction(async (tx) => runWrite(tx), {
    timeout: 30000, // 30 seconds for slow remote DB connections
  });

  // Resolve overdue asynchronously without blocking response
  if (!recordOnly && BUSINESS_RULES.PAYMENT.AUTO_RESOLVE_OVERDUE) {
    resolveOverdueOnPayment(memberId, gymId).catch((err) =>
      logger.error("Overdue resolution error:", err)
    );
  }

  return { ...r, isDuplicate: false };
}

/**
 * Bulk create payments
 */
export async function createBulkPayments(
  payments: CreatePaymentInput[]
): Promise<PaymentResult[]> {
  const results: PaymentResult[] = [];

  for (const paymentInput of payments) {
    try {
      const result = await createPayment(paymentInput);
      results.push(result);
    } catch (error) {
      logger.error(
        `[PAYMENT] Failed to create payment for member ${paymentInput.memberId}`,
        error instanceof Error ? error : new Error(String(error)),
        { memberId: paymentInput.memberId }
      );
    }
  }

  return results;
}

/**
 * Delete duplicate payments (admin only)
 */
export async function deleteDuplicatePayment(
  paymentId: string,
  userId: string,
  reason: string
): Promise<void> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) {
    throw new Error("Payment not found");
  }

  await logAction(userId, "payment_deleted", "Payment", paymentId, {
    memberId: payment.memberId,
    amount: payment.amount,
    paymentDate: payment.paymentDate
      ? payment.paymentDate.toISOString().split("T")[0]
      : payment.receivedAt.toISOString().split("T")[0],
    reason,
  });

  await prisma.payment.delete({ where: { id: paymentId } });
}
