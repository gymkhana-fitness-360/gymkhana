"use strict";

import { prisma } from "@/lib/prisma";
import { MemberStatus, PaymentMethod, Payment, Membership } from "@prisma/client";
import { toDateOnlyIST } from "@/lib/date-only";
import { getNextMemberId } from "@/lib/member-protection";
import { logAction } from "@/lib/audit-logger";
import { createPayment } from "./payment.service";
import { BUSINESS_RULES } from "@/lib/business-rules";
import { inferPlanFromAmount } from "./plan-inference";
import {
  validateMemberDisplayName,
  validateMemberPhoneDigits,
  validatePaymentCreateContext,
  validatePaymentAmount,
} from "@/lib/crud-business-validation";

/**
 * ADMISSION SERVICE
 * 
 * Handles new member admissions with payment.
 * Creates member, assigns member ID, creates membership, and records payment.
 */

export interface CreateAdmissionInput {
  gymId: string;
  name: string;
  phone: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: Date;
  planId?: string;
  duration?: string | null;
  userId: string;
  notes?: string;
  splitPayments?: Array<{ amount: number; method: PaymentMethod }>;
}

export interface AdmissionResult {
  member: {
    id: string;
    name: string;
    phone: string;
  };
  payment: Payment;
  membership: Membership | null;
}

/**
 * Create new member admission
 * 
 * WORKFLOW:
 * 1. Validate phone number is unique
 * 2. Generate member ID
 * 3. Create member record
 * 4. Create payment (which creates membership via payment.service)
 * 5. Log audit trail
 */
export async function createAdmission(
  input: CreateAdmissionInput
): Promise<AdmissionResult> {
  const {
    gymId,
    name,
    phone,
    amount,
    paymentMethod,
    paymentDate,
    planId,
    duration,
    userId,
    notes,
    splitPayments,
  } = input;

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Payment amount is required for new admissions.");
  }
  if (!paymentMethod) {
    throw new Error("Payment method is required for new admissions.");
  }
  
  validateMemberDisplayName(name);
  validateMemberPhoneDigits(phone);

  // Check if phone already exists
  const existingPhone = await prisma.member.findFirst({ where: { phone, gymId } });
  if (existingPhone) {
    throw new Error(`Phone ${phone} already belongs to ${existingPhone.name}. Use renewal for existing member.`);
  }
  
  // Determine plan from amount paid (primary admission rule)
  const activePlans = await prisma.plan.findMany({
    where: { isActive: true, gymId },
    select: { id: true, durationDays: true, price: true },
  });
  const inferred = inferPlanFromAmount(
    amount,
    activePlans.map((p) => ({
      id: p.id,
      durationDays: p.durationDays,
      price: Number(p.price),
    }))
  );
  const resolvedPlanId = inferred.planId || planId || BUSINESS_RULES.PLAN.DEFAULT_PLAN_ID;
  
  const paymentDateOnly = toDateOnlyIST(paymentDate);
  validatePaymentCreateContext({ amount, paymentDate: paymentDateOnly });

  // Create member with member ID
  const memberId = await getNextMemberId(phone);
  
  const member = await prisma.member.create({
    data: {
      id: memberId,
      gymId,
      name,
      phone,
      status: MemberStatus.ACTIVE,
      joinDate: paymentDateOnly,
      createdById: userId,
    },
  });
  
  // Create payment (which will create membership automatically)
  const paymentResult = await createPayment({
    memberId: member.id,
    gymId,
    amount,
    paymentMethod,
    paymentDate: paymentDateOnly,
    planId: resolvedPlanId,
    duration,
    userId,
    notes: notes || `New admission: ${name}`,
  });
  
  // Log admission
  await logAction(userId, "member_created", "Member", member.id, {
    name: member.name,
    phone: member.phone,
    memberId: member.id,
    admission: true,
  });
  
  return {
    member: {
      id: member.id,
      name: member.name,
      phone: member.phone,
    },
    payment: paymentResult.payment,
    membership: paymentResult.membership,
  };
}

/**
 * Handle split payment admissions
 */
export async function createAdmissionWithSplitPayment(
  input: CreateAdmissionInput
): Promise<AdmissionResult> {
  if (!input.splitPayments || input.splitPayments.length === 0) {
    throw new Error("Split payments required for this function");
  }

  for (const p of input.splitPayments) {
    validatePaymentAmount(p.amount);
  }

  const totalAmount = input.splitPayments.reduce((sum, p) => sum + p.amount, 0);
  
  // Create admission with total amount
  return createAdmission({
    ...input,
    amount: totalAmount,
    paymentMethod: PaymentMethod.MIXED,
  });
}
