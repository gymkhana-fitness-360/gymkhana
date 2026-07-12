import { prisma } from "@/lib/prisma";
import { listOpportunities } from "@/domains/revenue-opportunities";
import { getPaymentTimingInsights } from "@/domains/payments/payment-timing-insights";
import { listCommunicationEvents } from "@/domains/communications/communication-ledger";

export async function getMemberInsights(gymId: string, memberId: string) {
  const member = await prisma.member.findFirst({
    where: { id: memberId, gymId },
    include: {
      Membership: { orderBy: { endDate: "desc" }, take: 1, include: { Plan: true } },
      TrainerClient: {
        where: { isActive: true },
        include: { User: { select: { name: true } } },
        take: 1,
      },
    },
  });

  if (!member) return null;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [attendanceCount, payments, comms, opportunities, paymentTiming] =
    await Promise.all([
      prisma.attendance.count({
        where: { gymId, memberId, checkIn: { gte: thirtyDaysAgo } },
      }),
      prisma.payment.findMany({
        where: { gymId, memberId, status: "COMPLETED" },
        orderBy: { receivedAt: "desc" },
        take: 5,
      }),
      listCommunicationEvents(gymId, { memberId, limit: 10 }),
      listOpportunities(gymId, { status: "OPEN", limit: 50 }),
      getPaymentTimingInsights(gymId, memberId),
    ]);

  const opportunity = opportunities.find((o) => o.memberId === memberId);
  const membership = member.Membership[0];

  return {
    member: {
      id: member.id,
      name: member.name,
      phone: member.phone,
      status: member.status,
    },
    attendanceLast30Days: attendanceCount,
    latestMembership: membership
      ? {
          plan: membership.Plan.name,
          endDate: membership.endDate.toISOString().slice(0, 10),
          amount: Number(membership.amount),
        }
      : null,
    trainer: member.TrainerClient[0]?.User.name ?? null,
    opportunity: opportunity ?? null,
    recentPayments: payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      method: p.method,
      receivedAt: p.receivedAt.toISOString(),
    })),
    recentCommunications: comms.length,
    paymentTiming,
    engagementHints: [
      attendanceCount === 0 ? "No check-ins in 30 days" : null,
      opportunity ? opportunity.reasons[0] : null,
      paymentTiming.suggestDiscountWindow,
    ].filter(Boolean),
  };
}
