import { prisma } from "@/lib/prisma";
import { admitMemberWithPayment } from "@/domains/members/services/admit-member-with-payment";

export async function convertTrialToMember(
  gymId: string,
  userId: string,
  input: {
    trialVisitId: string;
    planId: string;
    amount: number;
    admissionFee?: number;
  },
) {
  const visit = await prisma.freeTrialVisit.findFirst({
    where: { id: input.trialVisitId, gymId },
  });
  if (!visit) return { error: "trial_not_found" as const };

  const existing = await prisma.member.findFirst({
    where: { gymId, phone: { contains: visit.phone.replace(/\D/g, "").slice(-10) } },
  });
  if (existing) {
    return { error: "member_exists" as const, memberId: existing.id };
  }

  const member = await admitMemberWithPayment(
    {
      name: visit.name,
      phone: visit.phone,
      planId: input.planId,
      amount: input.amount,
      admissionFee: input.admissionFee,
      paymentMethod: "CASH",
      startDate: new Date().toISOString(),
      studentOrGymfloPlan: false,
    },
    { gymId, userId },
  );

  return { member };
}
