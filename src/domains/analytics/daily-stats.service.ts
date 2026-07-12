import type { PrismaClient } from "@prisma/client";
import { MemberStatus, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { addDaysIST, todayIST, toDateOnlyIST } from "@/lib/date-only";
import { ATTENDANCE_RULES } from "@/domains/attendance/rules";
import {
  getLastOperationalDayYmdsIST,
  isoDateOnlyString,
} from "@/lib/gym-operational-days";
import { createLogger } from "@/lib/logger";
import { Prisma } from "@prisma/client";

const logger = createLogger("daily-stats");

let summaryTablesAvailable: boolean | null = null;

export async function areSummaryTablesAvailable(): Promise<boolean> {
  if (summaryTablesAvailable !== null) return summaryTablesAvailable;
  try {
    await prisma.dailyStats.findFirst({ select: { id: true }, take: 1 });
    summaryTablesAvailable = true;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") {
      summaryTablesAvailable = false;
    } else {
      throw e;
    }
  }
  return summaryTablesAvailable;
}

export type DailyStatsSnapshot = {
  gymId: string;
  statDate: string;
  totalMembers: number;
  activeMembers: number;
  todayCheckIns: number;
  currentlyInGym: number;
  qrCheckInsToday: number;
  todayCollection: number;
  todayPaymentCount: number;
  expiringThisWeek: number;
  overdueCount: number;
  renewalsBadge: number;
  monthPaymentCount: number;
  monthPaymentTotal: number;
  attendanceEligible: number;
  attendanceActiveToday: number;
  attendanceCheckedIn: number;
  attendancePending: number;
  updatedAt: Date;
};

function monthBoundsIST(today: Date): { start: Date; endExclusive: Date } {
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  return {
    start: new Date(Date.UTC(y, m, 1, 0, 0, 0, 0)),
    endExclusive: new Date(Date.UTC(y, m + 1, 1, 0, 0, 0, 0)),
  };
}

export async function computeDailyStatsSnapshot(
  gymId: string,
  dateYmd?: string,
): Promise<DailyStatsSnapshot> {
  const today = dateYmd ? toDateOnlyIST(dateYmd) : todayIST();
  const todayYmd = isoDateOnlyString(today);
  const tomorrow = addDaysIST(today, 1);
  const sevenDays = addDaysIST(today, 7);
  const { start: monthStart, endExclusive: monthEnd } = monthBoundsIST(today);
  const graceCutoff = addDaysIST(today, -ATTENDANCE_RULES.GRACE_PERIOD_DAYS_AFTER_EXPIRY);

  const [
    totalMembers,
    activeMembers,
    todayCheckIns,
    currentlyInGym,
    qrCheckInsToday,
    todayPayments,
    expiringThisWeek,
    monthPayments,
    eligibleMembers,
    checkedInToday,
    overdueCount,
    renewalsBadge,
  ] = await Promise.all([
    prisma.member.count({ where: { gymId } }),
    prisma.member.count({ where: { gymId, status: MemberStatus.ACTIVE } }),
    prisma.attendance.count({
      where: { gymId, checkIn: { gte: today, lt: tomorrow } },
    }),
    prisma.attendance.count({
      where: {
        gymId,
        checkIn: { gte: today, lt: tomorrow },
        checkOut: null,
        method: { not: "MANUAL" },
      },
    }),
    prisma.attendance.count({
      where: { gymId, checkIn: { gte: today, lt: tomorrow }, method: "QR_CODE" },
    }),
    prisma.payment.aggregate({
      where: {
        gymId,
        receivedAt: { gte: today, lt: tomorrow },
        status: PaymentStatus.COMPLETED,
      },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.member.count({
      where: {
        gymId,
        status: MemberStatus.ACTIVE,
        nextRenewalDate: { gte: today, lte: sevenDays },
      },
    }),
    Promise.all([
      prisma.payment.count({
        where: {
          gymId,
          receivedAt: { gte: monthStart, lt: monthEnd },
          status: PaymentStatus.COMPLETED,
        },
      }),
      prisma.payment.aggregate({
        where: {
          gymId,
          receivedAt: { gte: monthStart, lt: monthEnd },
          status: PaymentStatus.COMPLETED,
        },
        _sum: { amount: true },
      }),
    ]),
    prisma.member.count({
      where: {
        gymId,
        Membership: { some: { endDate: { gte: graceCutoff } } },
      },
    }),
    prisma.attendance.groupBy({
      by: ["memberId"],
      where: { gymId, checkIn: { gte: today, lt: tomorrow } },
    }),
    prisma.member.count({
      where: {
        gymId,
        OR: [
          { status: MemberStatus.EXPIRED },
          { nextRenewalDate: { lt: today } },
        ],
      },
    }),
    prisma.member.count({
      where: {
        gymId,
        status: MemberStatus.ACTIVE,
        nextRenewalDate: { gte: today, lte: sevenDays },
      },
    }),
  ]);

  const attendanceCheckedIn = checkedInToday.length;
  const attendancePending = Math.max(0, eligibleMembers - attendanceCheckedIn);

  return {
    gymId,
    statDate: todayYmd,
    totalMembers,
    activeMembers,
    todayCheckIns,
    currentlyInGym,
    qrCheckInsToday,
    todayCollection: Number(todayPayments._sum.amount ?? 0),
    todayPaymentCount: todayPayments._count.id ?? 0,
    expiringThisWeek,
    overdueCount,
    renewalsBadge,
    monthPaymentCount: monthPayments[0],
    monthPaymentTotal: Number(monthPayments[1]._sum.amount ?? 0),
    attendanceEligible: eligibleMembers,
    attendanceActiveToday: eligibleMembers,
    attendanceCheckedIn,
    attendancePending,
    updatedAt: new Date(),
  };
}

export async function upsertDailyStats(gymId: string, dateYmd?: string): Promise<DailyStatsSnapshot> {
  const snap = await computeDailyStatsSnapshot(gymId, dateYmd);
  if (!(await areSummaryTablesAvailable())) {
    return snap;
  }

  const statDate = toDateOnlyIST(snap.statDate);
  await prisma.dailyStats.upsert({
    where: { gymId_statDate: { gymId, statDate } },
    create: {
      gymId,
      statDate,
      totalMembers: snap.totalMembers,
      activeMembers: snap.activeMembers,
      todayCheckIns: snap.todayCheckIns,
      currentlyInGym: snap.currentlyInGym,
      qrCheckInsToday: snap.qrCheckInsToday,
      todayCollection: snap.todayCollection,
      todayPaymentCount: snap.todayPaymentCount,
      expiringThisWeek: snap.expiringThisWeek,
      overdueCount: snap.overdueCount,
      renewalsBadge: snap.renewalsBadge,
      monthPaymentCount: snap.monthPaymentCount,
      monthPaymentTotal: snap.monthPaymentTotal,
      attendanceEligible: snap.attendanceEligible,
      attendanceActiveToday: snap.attendanceActiveToday,
      attendanceCheckedIn: snap.attendanceCheckedIn,
      attendancePending: snap.attendancePending,
    },
    update: {
      totalMembers: snap.totalMembers,
      activeMembers: snap.activeMembers,
      todayCheckIns: snap.todayCheckIns,
      currentlyInGym: snap.currentlyInGym,
      qrCheckInsToday: snap.qrCheckInsToday,
      todayCollection: snap.todayCollection,
      todayPaymentCount: snap.todayPaymentCount,
      expiringThisWeek: snap.expiringThisWeek,
      overdueCount: snap.overdueCount,
      renewalsBadge: snap.renewalsBadge,
      monthPaymentCount: snap.monthPaymentCount,
      monthPaymentTotal: snap.monthPaymentTotal,
      attendanceEligible: snap.attendanceEligible,
      attendanceActiveToday: snap.attendanceActiveToday,
      attendanceCheckedIn: snap.attendanceCheckedIn,
      attendancePending: snap.attendancePending,
    },
  });

  return snap;
}

export async function refreshAllGymDailyStats(): Promise<{ gymId: string; ok: boolean }[]> {
  const gyms = await prisma.gym.findMany({ select: { id: true } });
  const results: { gymId: string; ok: boolean }[] = [];
  for (const gym of gyms) {
    try {
      await upsertDailyStats(gym.id);
      results.push({ gymId: gym.id, ok: true });
    } catch (e) {
      logger.error(`daily stats failed for ${gym.id}`, e as Error);
      results.push({ gymId: gym.id, ok: false });
    }
  }
  return results;
}

export type AttendanceCallListMember = {
  id: string;
  name: string;
  phone: string;
  lastAttendanceDate: string | null;
};

export type AttendanceCallListResult = {
  operationalDays: string[];
  missedOperationalDayCount: number;
  members: AttendanceCallListMember[];
};

export async function getAttendanceCallList(
  prismaClient: PrismaClient,
  gymId: string,
): Promise<AttendanceCallListResult> {
  const missedCount = ATTENDANCE_RULES.CALL_LIST_MISSED_OPERATIONAL_DAYS;
  const operationalDays = getLastOperationalDayYmdsIST(missedCount);
  if (operationalDays.length === 0) {
    return { operationalDays: [], missedOperationalDayCount: missedCount, members: [] };
  }

  const today = todayIST();
  const members = await prismaClient.member.findMany({
    where: {
      gymId,
      status: MemberStatus.ACTIVE,
      phone: { not: "" },
      Membership: { some: { endDate: { gte: today } } },
    },
    select: { id: true, name: true, phone: true },
    orderBy: { name: "asc" },
  });

  if (members.length === 0) {
    return { operationalDays, missedOperationalDayCount: missedCount, members: [] };
  }

  const opDates = operationalDays.map((d) => toDateOnlyIST(d));
  const rangeStart = opDates[opDates.length - 1]!;
  const rangeEndExclusive = addDaysIST(opDates[0]!, 1);
  const memberIds = members.map((m) => m.id);

  const attendance = await prismaClient.attendance.findMany({
    where: {
      gymId,
      memberId: { in: memberIds },
      checkIn: { gte: rangeStart, lt: rangeEndExclusive },
    },
    select: { memberId: true, checkIn: true },
  });

  const attendedDaysByMember = new Map<string, Set<string>>();
  for (const row of attendance) {
    const ymd = isoDateOnlyString(row.checkIn);
    let set = attendedDaysByMember.get(row.memberId);
    if (!set) {
      set = new Set();
      attendedDaysByMember.set(row.memberId, set);
    }
    set.add(ymd);
  }

  const missedSet = new Set(operationalDays);
  const absentIds: string[] = [];
  for (const m of members) {
    const attended = attendedDaysByMember.get(m.id) ?? new Set<string>();
    const missedAll = [...missedSet].every((ymd) => !attended.has(ymd));
    if (missedAll) absentIds.push(m.id);
  }

  if (absentIds.length === 0) {
    return { operationalDays, missedOperationalDayCount: missedCount, members: [] };
  }

  const lastRows = await prismaClient.attendance.groupBy({
    by: ["memberId"],
    where: { gymId, memberId: { in: absentIds } },
    _max: { checkIn: true },
  });
  const lastByMember = new Map(lastRows.map((r) => [r.memberId, r._max.checkIn]));

  const callMembers = members
    .filter((m) => absentIds.includes(m.id) && m.phone?.trim())
    .map((m) => {
      const last = lastByMember.get(m.id);
      return {
        id: m.id,
        name: m.name,
        phone: m.phone!.trim(),
        lastAttendanceDate: last ? isoDateOnlyString(last) : null,
      };
    });

  return { operationalDays, missedOperationalDayCount: missedCount, members: callMembers };
}
