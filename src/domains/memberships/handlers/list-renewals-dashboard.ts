import { NextRequest, NextResponse } from "next/server";
import { cachedJson } from "@/lib/api-cache";
import { prisma } from "@/lib/prisma";
import { MemberStatus } from "@prisma/client";
import { todayIST, addDaysIST } from "@/lib/date-only";
import { createLogger } from "@/lib/logger";
import { ApiErrors } from "@/lib/api-response";
import { getGymContext, GymContextError } from "@/domains/tenancy";

const logger = createLogger("memberships-renewals");

const RENEWAL_DAYS = {
  PENDING_10: 10,
  PENDING_20: 20,
  MAX_RESULTS: 100,
} as const;

const activeMember = (gymId: string) => ({
  status: MemberStatus.ACTIVE,
  gymId,
});

export async function listRenewalsDashboardHandler(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const { gymId } = await getGymContext(request);

    const today = todayIST();
    const tomorrow = addDaysIST(today, 1);
    const fourteenDaysAgo = addDaysIST(today, -14);
    const eightDaysFromNow = addDaysIST(today, 8);

    const year = today.getUTCFullYear();
    const month = today.getUTCMonth();
    const endOfMonth = new Date(Date.UTC(year, month + 1, 0, 0, 0, 0, 0));
    const startOfNextMonth = addDaysIST(endOfMonth, 1);

    const oneDayAgo = addDaysIST(today, -1);
    const tenDaysAgo = addDaysIST(today, -RENEWAL_DAYS.PENDING_10);
    const elevenDaysAgo = addDaysIST(today, -11);
    const twentyDaysAgo = addDaysIST(today, -RENEWAL_DAYS.PENDING_20);

    const membershipInclude = {
      Member: { select: { id: true, name: true, phone: true } },
      Plan: { select: { name: true } },
    } as const;

    const [today_renewals, thisWeek, thisMonth] = await Promise.all([
      prisma.membership.findMany({
        where: {
          gymId,
          endDate: { gte: fourteenDaysAgo, lte: today },
          Member: activeMember(gymId),
        },
        include: membershipInclude,
        orderBy: { endDate: "asc" },
        distinct: ["memberId"],
      }),
      prisma.membership.findMany({
        where: {
          gymId,
          endDate: { gte: tomorrow, lt: eightDaysFromNow },
          Member: activeMember(gymId),
        },
        include: membershipInclude,
        orderBy: { endDate: "asc" },
        distinct: ["memberId"],
      }),
      prisma.membership.findMany({
        where: {
          gymId,
          endDate: { gte: eightDaysFromNow, lt: startOfNextMonth },
          Member: activeMember(gymId),
        },
        include: membershipInclude,
        orderBy: { endDate: "asc" },
        distinct: ["memberId"],
      }),
    ]);

    const pending10Days = await prisma.member.findMany({
      where: {
        gymId,
        status: MemberStatus.ACTIVE,
        lastPaymentDate: { gte: tenDaysAgo, lte: oneDayAgo },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        lastPaymentDate: true,
        Membership: {
          where: { gymId },
          orderBy: { endDate: "desc" },
          take: 1,
          include: { Plan: { select: { name: true } } },
        },
      },
      orderBy: { lastPaymentDate: "desc" },
    });

    const pending20Days = await prisma.member.findMany({
      where: {
        gymId,
        status: MemberStatus.ACTIVE,
        lastPaymentDate: { gte: twentyDaysAgo, lt: elevenDaysAgo },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        lastPaymentDate: true,
        Membership: {
          where: { gymId },
          orderBy: { endDate: "desc" },
          take: 1,
          include: { Plan: { select: { name: true } } },
        },
      },
      orderBy: { lastPaymentDate: "desc" },
      take: RENEWAL_DAYS.MAX_RESULTS,
    });

    const formatPending = (
      rows: typeof pending10Days
    ) =>
      rows
        .filter((m) => m.Membership.length > 0)
        .map((m) => ({
          id: m.Membership[0].id,
          memberId: m.id,
          startDate: m.Membership[0].startDate,
          endDate: m.Membership[0].endDate,
          amount: m.Membership[0].amount,
          Member: { name: m.name, phone: m.phone, externalId: m.id },
          Plan: m.Membership[0].Plan,
        }));

    return cachedJson({
      today: today_renewals,
      thisWeek,
      thisMonth,
      pending10Days: formatPending(pending10Days),
      pending20Days: formatPending(pending20Days),
      totalDueThisMonth:
        today_renewals.length + thisWeek.length + thisMonth.length,
    });
  } catch (error) {
    if (error instanceof GymContextError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    logger.error("Error fetching renewals:", error as Error);
    return ApiErrors.internal("Failed to fetch renewals");
  }
}
