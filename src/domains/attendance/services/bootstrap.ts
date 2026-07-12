import type { PrismaClient } from "@prisma/client";
import { addDaysIST, todayIST, toDateOnlyIST } from "@/lib/date-only";
import { isoDateOnlyString } from "@/lib/gym-operational-days";
import { ATTENDANCE_RULES } from "@/domains/attendance/rules";
import { getAttendanceCallList } from "@/domains/analytics/daily-stats.service";

export type AttendanceBootstrapPayload = {
  members: Array<{
    id: string;
    name: string;
    phone: string | null;
    status: string;
    Membership?: unknown[];
  }>;
  attendanceByDate: Array<{
    id: string;
    memberId: string;
    checkIn: string;
    checkOut: string | null;
    method: string;
    member: { id: string; name: string; phone: string | null };
  }>;
  todayAttendance: AttendanceBootstrapPayload["attendanceByDate"];
  callList: Awaited<ReturnType<typeof getAttendanceCallList>>;
  date: string;
  today: string;
};

function istDayRange(dateYmd: string): { start: Date; endExclusive: Date } {
  const start = toDateOnlyIST(dateYmd);
  return { start, endExclusive: addDaysIST(start, 1) };
}

async function fetchAttendanceForDate(prisma: PrismaClient, gymId: string, dateYmd: string) {
  const { start, endExclusive } = istDayRange(dateYmd);
  const rows = await prisma.attendance.findMany({
    where: { gymId, checkIn: { gte: start, lt: endExclusive } },
    include: {
      Member: { select: { id: true, name: true, phone: true } },
    },
    orderBy: { checkIn: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    memberId: r.memberId,
    checkIn: r.checkIn.toISOString(),
    checkOut: r.checkOut?.toISOString() ?? null,
    method: r.method,
    member: {
      id: r.Member.id,
      name: r.Member.name,
      phone: r.Member.phone,
    },
  }));
}

export async function loadAttendanceBootstrap(
  prisma: PrismaClient,
  gymId: string,
  dateYmd: string,
): Promise<AttendanceBootstrapPayload> {
  const todayYmd = isoDateOnlyString(todayIST());
  const graceCutoff = addDaysIST(toDateOnlyIST(dateYmd), -ATTENDANCE_RULES.GRACE_PERIOD_DAYS_AFTER_EXPIRY);

  const [members, attendanceByDate, todayAttendance, callList] = await Promise.all([
    prisma.member.findMany({
      where: {
        gymId,
        Membership: { some: { endDate: { gte: graceCutoff } } },
      },
      include: {
        Membership: {
          where: { endDate: { gte: graceCutoff } },
          orderBy: { endDate: "desc" },
          take: 4,
          select: {
            startDate: true,
            endDate: true,
            Plan: { select: { name: true, planType: true } },
          },
        },
      },
      orderBy: { name: "asc" },
      take: ATTENDANCE_RULES.BOOTSTRAP_MEMBER_LIMIT,
    }),
    fetchAttendanceForDate(prisma, gymId, dateYmd),
    dateYmd === todayYmd
      ? null
      : fetchAttendanceForDate(prisma, gymId, todayYmd),
    getAttendanceCallList(prisma, gymId),
  ]);

  const todayRows =
    dateYmd === todayYmd ? attendanceByDate : todayAttendance ?? [];

  return {
    members,
    attendanceByDate,
    todayAttendance: todayRows,
    callList,
    date: dateYmd,
    today: todayYmd,
  };
}

export async function loadAttendanceBootstrapCritical(
  prisma: PrismaClient,
  gymId: string,
  dateYmd: string,
) {
  const full = await loadAttendanceBootstrap(prisma, gymId, dateYmd);
  return {
    members: full.members,
    callList: full.callList,
    date: full.date,
    today: full.today,
  };
}

export async function loadAttendanceBootstrapRecords(
  prisma: PrismaClient,
  gymId: string,
  dateYmd: string,
) {
  const todayYmd = isoDateOnlyString(todayIST());
  const [attendanceByDate, todayAttendance] =
    dateYmd === todayYmd
      ? await Promise.all([fetchAttendanceForDate(prisma, gymId, dateYmd), null])
      : await Promise.all([
          fetchAttendanceForDate(prisma, gymId, dateYmd),
          fetchAttendanceForDate(prisma, gymId, todayYmd),
        ]);

  return {
    attendanceByDate,
    todayAttendance: todayAttendance ?? attendanceByDate,
    date: dateYmd,
    today: todayYmd,
  };
}
