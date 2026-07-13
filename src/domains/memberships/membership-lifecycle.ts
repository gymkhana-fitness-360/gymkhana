import { prisma } from "@/lib/prisma";
import { MemberStatus } from "@prisma/client";
import { todayIST } from "@/lib/date-only";
import { createOrExtendMembership } from "@/lib/services/membership.service";

export async function createMembershipForMember(
  gymId: string,
  input: {
    memberId: string;
    planId: string;
    amount: number;
    startDate?: Date;
    durationMonths?: number;
    userId?: string;
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

  const duration =
    input.durationMonths != null
      ? input.durationMonths === 1
        ? "monthly"
        : `${input.durationMonths}month`
      : null;

  const result = await createOrExtendMembership({
    memberId: input.memberId,
    gymId,
    planId: input.planId,
    amount: input.amount,
    paymentDate: input.startDate ?? todayIST(),
    duration,
    userId: input.userId ?? "system",
  });

  return prisma.membership.findUnique({
    where: { id: result.membership.id },
    include: { Plan: true, Member: { select: { id: true, name: true } } },
  });
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

  await prisma.member.updateMany({
    where: { id: membership.memberId, gymId },
    data: { status: MemberStatus.EXPIRED, nextRenewalDate: end },
  });

  return { membership: updated, memberId: membership.memberId };
}
