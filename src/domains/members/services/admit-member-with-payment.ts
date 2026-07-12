import { prisma } from "@/lib/prisma";
import { MemberStatus } from "@prisma/client";
import { getNextMemberId } from "@/lib/member-protection";
import { logAction } from "@/lib/audit-logger";
import { createPayment } from "@/lib/services/payment.service";
import { inferPlanFromAmount } from "@/lib/services/plan-inference";
import {
  validateMemberDisplayName,
  validateMemberPhoneDigits,
  validatePaymentCreateContext,
  normalizeStorageCalendarDate,
} from "@/lib/crud-business-validation";
import { createMemberSchema } from "@/lib/validators";
import type { z } from "zod";
import { markLeadConvertedByPhone } from "@/domains/leads/service";
import { getChargePolicy } from "@/lib/gym-settings/charge-policy";
import { memberApiDetailInclude, type MemberApiDetailDTO } from "../types";

export type AdmitMemberInput = z.infer<typeof createMemberSchema> & {
  admissionFee?: number | string;
  personalTrainingFee?: number | string;
};

export type AdmitMemberContext = {
  gymId: string;
  userId: string;
};

export async function admitMemberWithPayment(
  input: AdmitMemberInput,
  ctx: AdmitMemberContext
): Promise<MemberApiDetailDTO> {
  const {
    name,
    phone,
    gender,
    dateOfBirth,
    address,
    emergencyContact,
    planId: providedPlanId,
    startDate,
    amount,
    paymentMethod,
    paymentReference,
    packageDuration,
    isPersonalTrainer,
    friendsFamilyDiscount,
    monthlyRate,
    studentOrGymfloPlan,
    specialOccasion,
    admissionFee,
    personalTrainingFee,
  } = input;

  const existingMember = await prisma.member.findFirst({
    where: { phone, gymId: ctx.gymId },
  });
  if (existingMember) {
    throw new AdmitMemberError("Member with this phone number already exists", "DUPLICATE_PHONE");
  }

  validateMemberDisplayName(name);
  validateMemberPhoneDigits(phone);

  const policy = await getChargePolicy(ctx.gymId);
  const planAmount = parseFloat(String(amount || "0"));
  const admissionAmount = parseFloat(
    String(admissionFee ?? (admissionFee === undefined ? policy.admissionFee : 0))
  );
  const ptAmount = parseFloat(String(personalTrainingFee || "0"));
  const totalPaymentAmount = planAmount + admissionAmount + ptAmount;

  if (!paymentMethod) {
    throw new AdmitMemberError("Payment method is required for new admissions", "VALIDATION");
  }
  if (!Number.isFinite(totalPaymentAmount) || totalPaymentAmount <= 0) {
    throw new AdmitMemberError("Payment amount is required for new admissions", "VALIDATION");
  }

  const activePlans = await prisma.plan.findMany({
    where: { isActive: true, gymId: ctx.gymId },
    select: { id: true, durationDays: true, price: true },
  });
  // Infer the plan from the plan amount only — admission/PT fees inflate the total
  // and would otherwise mislabel the plan/duration (e.g. a ₹1000 monthly + ₹800
  // admission looking like a quarterly plan).
  const inferredPlan = inferPlanFromAmount(
    planAmount > 0 ? planAmount : totalPaymentAmount,
    activePlans.map((p) => ({
      id: p.id,
      durationDays: p.durationDays,
      price: Number(p.price),
    }))
  );
  const resolvedPlanId = inferredPlan.planId || providedPlanId || "monthly";

  const start = normalizeStorageCalendarDate(startDate);
  validatePaymentCreateContext({ amount: totalPaymentAmount, paymentDate: start });

  const paymentNotes: string[] = [];
  if (packageDuration) paymentNotes.push(`Package: ${packageDuration}`);
  if (isPersonalTrainer) paymentNotes.push("Personal Trainer (PT)");
  if (friendsFamilyDiscount) paymentNotes.push("Friends & Family Discount");
  if (monthlyRate) paymentNotes.push(`Monthly Rate: ₹${monthlyRate}`);
  if (studentOrGymfloPlan) paymentNotes.push("Student / Fitness360 Plan (2 people)");
  if (specialOccasion) paymentNotes.push(`Special Offer: ${specialOccasion}`);
  if (admissionAmount > 0) paymentNotes.push(`Admission Fee: ₹${admissionAmount}`);
  if (ptAmount > 0) paymentNotes.push(`PT Fee: ₹${ptAmount}`);
  if (admissionAmount > 0 || ptAmount > 0) {
    paymentNotes.push(`Plan Amount: ₹${planAmount}, Total: ₹${totalPaymentAmount}`);
  }

  const member = await prisma.$transaction(async (tx) => {
    const newMember = await tx.member.create({
      data: {
        id: await getNextMemberId(phone, ctx.gymId),
        gymId: ctx.gymId,
        name,
        phone,
        gender: gender || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        address: address || null,
        emergencyContact: emergencyContact || null,
        status: MemberStatus.ACTIVE,
        joinDate: start,
        createdById: ctx.userId,
      },
    });

    await createPayment(
      {
        memberId: newMember.id,
        gymId: ctx.gymId,
        amount: totalPaymentAmount,
        paymentMethod,
        paymentDate: start,
        planId: resolvedPlanId,
        duration: packageDuration || null,
        userId: ctx.userId,
        notes: paymentNotes.length > 0 ? paymentNotes.join("; ") : undefined,
        reference: paymentReference || null,
        packageDuration: packageDuration || null,
        isPersonalTrainer: isPersonalTrainer || false,
        friendsFamilyDiscount: friendsFamilyDiscount || false,
        monthlyRate: monthlyRate ? parseFloat(monthlyRate.toString()) : null,
        studentGymfloPlan: studentOrGymfloPlan || false,
        specialOccasion: specialOccasion || null,
      },
      { tx }
    );

    return newMember;
  });

  const memberWithMembership = await prisma.member.findUnique({
    where: { id: member.id },
    include: memberApiDetailInclude,
  });

  if (!memberWithMembership) {
    throw new AdmitMemberError("Member created but could not be loaded", "INTERNAL");
  }

  await logAction(ctx.userId, "member_created", "Member", member.id, {
    name: member.name,
    phone: member.phone,
  });

  await markLeadConvertedByPhone(ctx.gymId, phone, member.id).catch(() => null);

  return memberWithMembership;
}

export class AdmitMemberError extends Error {
  constructor(
    message: string,
    readonly code: "DUPLICATE_PHONE" | "VALIDATION" | "INTERNAL"
  ) {
    super(message);
    this.name = "AdmitMemberError";
  }
}
