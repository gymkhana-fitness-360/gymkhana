import { prisma } from "@/lib/prisma";
import { daysFromTodayIST, toDateOnlyIST } from "@/lib/date-only";
import type { MemberOpportunityInput } from "./types";

export async function buildMemberOpportunityInput(
  gymId: string,
  memberId: string,
): Promise<MemberOpportunityInput | null> {
  const member = await prisma.member.findFirst({
    where: { id: memberId, gymId },
    include: {
      Membership: {
        orderBy: { endDate: "desc" },
        take: 1,
        include: { Plan: true },
      },
      Payment: {
        where: { status: "COMPLETED" },
        orderBy: { receivedAt: "desc" },
        take: 1,
      },
      Attendance: {
        where: {
          checkIn: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      },
      OverdueTracking: {
        where: { resolvedAt: null },
      },
    },
  });

  if (!member) return null;

  const latestMembership = member.Membership[0];
  const daysToExpiry = latestMembership
    ? -daysFromTodayIST(toDateOnlyIST(latestMembership.endDate))
    : 999;

  const membershipValue = latestMembership ? Number(latestMembership.amount) : 0;

  const paymentsLast90Days = await prisma.payment.count({
    where: {
      gymId,
      memberId,
      status: "COMPLETED",
      receivedAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
    },
  });

  const remindersLast30Days = await prisma.reminderLog.count({
    where: {
      gymId,
      memberId,
      sentAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
  });

  const lastPayment = member.Payment[0];
  const daysSinceLastPayment = lastPayment
    ? Math.floor(
        (Date.now() - new Date(lastPayment.receivedAt).getTime()) /
          (24 * 60 * 60 * 1000),
      )
    : null;

  const overdueAmount =
    member.OverdueTracking.length > 0
      ? membershipValue * member.OverdueTracking.length
      : daysToExpiry < 0
        ? membershipValue
        : 0;

  return {
    memberId: member.id,
    memberName: member.name,
    membershipValue: membershipValue || 0,
    daysToExpiry,
    overdueAmount,
    attendanceLast30Days: member.Attendance.length,
    paymentsLast90Days,
    remindersLast30Days,
    daysSinceLastPayment,
  };
}
