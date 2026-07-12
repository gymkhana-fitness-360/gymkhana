import { prisma } from "@/lib/prisma";
import { MemberStatus } from "@prisma/client";
import { todayIST, addDaysIST } from "@/lib/date-only";

export async function createMembershipForMember(
  gymId: string,
  input: {
    memberId: string;
    planId: string;
    amount: number;
    startDate?: Date;
    durationMonths?: number;
  },
) {
  const member = await prisma.member.findFirst({
    where: { id: input.memberId, gymId },
  });
  if (!member) return null;

  const plan = await prisma.plan.findFirst({
    where: { id: input.planId, gymId },
  });
  if (!plan) return null;

  const start = input.startDate ?? todayIST();
  const durationDays = input.durationMonths
    ? input.durationMonths * 30
    : plan.durationDays;
  const end = addDaysIST(start, durationDays);

  const membership = await prisma.membership.create({
    data: {
      gymId,
      memberId: input.memberId,
      planId: input.planId,
      amount: input.amount,
      startDate: start,
      endDate: end,
    },
    include: { Plan: true, Member: { select: { id: true, name: true } } },
  });

  await prisma.member.update({
    where: { id: input.memberId },
    data: { status: MemberStatus.ACTIVE, nextRenewalDate: end },
  });

  return membership;
}

export async function cancelMembershipForGym(
  gymId: string,
  membershipId: string,
) {
  const membership = await prisma.membership.findFirst({
    where: { id: membershipId, gymId },
  });
  if (!membership) return null;

  const end = todayIST();
  const updated = await prisma.membership.update({
    where: { id: membershipId },
    data: { endDate: end },
  });

  await prisma.member.update({
    where: { id: membership.memberId },
    data: { status: MemberStatus.EXPIRED, nextRenewalDate: end },
  });

  return { membership: updated, memberId: membership.memberId };
}
