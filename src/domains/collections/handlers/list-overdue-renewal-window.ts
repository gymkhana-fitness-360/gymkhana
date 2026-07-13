import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MemberStatus } from "@prisma/client";
import { todayIST, addDaysIST } from "@/lib/date-only";
import { createLogger } from "@/lib/logger";

const logger = createLogger("collections-overdue-renewal-window");

/** Members whose nextRenewalDate fell within the last 30 days (renewal overdue window). */
export async function listOverdueRenewalWindow(gymId: string) {
  const today = todayIST();
  const thirtyDaysAgo = addDaysIST(today, -30);

  const members = await prisma.member.findMany({
    where: {
      gymId,
      nextRenewalDate: {
        gte: thirtyDaysAgo,
        lte: today,
      },
      status: {
        in: [MemberStatus.ACTIVE, MemberStatus.EXPIRED],
      },
    },
    include: {
      Membership: {
        orderBy: { endDate: "desc" },
        take: 1,
        include: {
          Plan: {
            select: { name: true },
          },
        },
      },
    },
    orderBy: { nextRenewalDate: "asc" },
    take: 500,
  });

  const overdueMembers = members
    .map((m) => {
      const daysOverdue = Math.floor(
        (today.getTime() - m.nextRenewalDate!.getTime()) / (1000 * 60 * 60 * 24),
      );
      const latestMembership = m.Membership[0];
      return {
        memberId: m.id,
        name: m.name,
        phone: m.phone,
        lastPaymentDate: m.lastPaymentDate,
        membershipEndDate: m.nextRenewalDate!,
        daysSinceExpiry: daysOverdue,
        amount: latestMembership ? Number(latestMembership.amount) : 0,
        planName: latestMembership?.Plan.name || "Unknown",
      };
    })
    .sort((a, b) => b.daysSinceExpiry - a.daysSinceExpiry);

  logger.info("listOverdueRenewalWindow", { gymId, count: overdueMembers.length });

  return NextResponse.json({
    success: true,
    overdueMembers,
    totalOverdue: overdueMembers.length,
  });
}
