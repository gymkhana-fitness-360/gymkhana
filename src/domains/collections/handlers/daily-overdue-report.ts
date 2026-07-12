/**
 * Daily overdue attendance report — per gym. Sends via Meta WABA when configured.
 */
import { prisma } from "@/lib/prisma";
import { todayIST, toDateOnlyIST, addDaysIST } from "@/lib/date-only";
import { sendMetaWabaText, isMetaWabaConfigured } from "@/lib/whatsapp/meta-cloud";
import { createLogger } from "@/lib/logger";
import { differenceInCalendarDays } from "date-fns";

const logger = createLogger("collections-daily-overdue-report");
const OVERDUE_WINDOW_DAYS = 15;

const ADMIN_PHONES = (process.env.ADMIN_REPORT_PHONES ?? "")
  .split(",")
  .map((p) => p.trim())
  .filter(Boolean);

function fmtDate(d: Date): string {
  return toDateOnlyIST(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    timeZone: "Asia/Kolkata",
  });
}

function formatReport(
  gymName: string,
  todayRows: { name: string; phone: string | null; nextRenewalDate: Date | null }[],
  attendingRows: {
    name: string;
    phone: string | null;
    nextRenewalDate: Date | null;
    expiredCheckIns: number;
    checkInDates: string[];
  }[],
): string {
  const today = todayIST();
  const dateStr = today.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

  const parts: string[] = [`📋 *${gymName} — ${dateStr}*`];

  if (todayRows.length === 0) {
    parts.push("✅ No overdue check-ins today.");
  } else {
    parts.push(`🚨 *${todayRows.length} overdue checked in TODAY:*`);
    todayRows.forEach((r, i) => {
      const daysOverdue = r.nextRenewalDate
        ? differenceInCalendarDays(today, toDateOnlyIST(r.nextRenewalDate))
        : "?";
      const due = r.nextRenewalDate ? fmtDate(r.nextRenewalDate) : "?";
      parts.push(`${i + 1}. *${r.name}* · ${r.phone ?? "—"}\n   Due ${due} · ${daysOverdue}d overdue`);
    });
  }

  const todayNames = new Set(todayRows.map((r) => r.name));
  const patternRows = attendingRows.filter((r) => !todayNames.has(r.name));
  if (patternRows.length > 0) {
    parts.push(`⚠️ *${patternRows.length} attending after expiry:*`);
    patternRows.forEach((r, i) => {
      const due = r.nextRenewalDate ? fmtDate(r.nextRenewalDate) : "?";
      parts.push(
        `${i + 1}. *${r.name}* · ${r.phone ?? "—"}\n   Due ${due} · Last in ${r.checkInDates[0] ?? "?"} (${r.expiredCheckIns}x)`,
      );
    });
  }

  return parts.join("\n");
}

async function buildGymReport(gymId: string, gymName: string) {
  const today = todayIST();
  const tomorrow = addDaysIST(today, 1);
  const windowStart = addDaysIST(today, -OVERDUE_WINDOW_DAYS);

  const todayOverdue = await prisma.member.findMany({
    where: {
      gymId,
      Attendance: { some: { checkIn: { gte: today, lt: tomorrow } } },
      OR: [{ nextRenewalDate: { lt: today } }, { status: "EXPIRED" }],
    },
    select: { name: true, phone: true, nextRenewalDate: true },
    orderBy: { nextRenewalDate: "asc" },
  });

  const overdueMembers = await prisma.member.findMany({
    where: {
      gymId,
      OR: [
        { nextRenewalDate: { gte: windowStart, lt: today } },
        { status: "EXPIRED", nextRenewalDate: { gte: windowStart } },
      ],
    },
    select: {
      id: true,
      name: true,
      phone: true,
      nextRenewalDate: true,
      Membership: { orderBy: { endDate: "desc" }, take: 1, select: { endDate: true } },
    },
  });

  const attendingRows: {
    name: string;
    phone: string | null;
    nextRenewalDate: Date | null;
    expiredCheckIns: number;
    checkInDates: string[];
  }[] = [];

  for (const member of overdueMembers) {
    const membershipEnd = member.Membership[0]?.endDate;
    if (!membershipEnd) continue;

    const expiredAtt = await prisma.attendance.findMany({
      where: { gymId, memberId: member.id, checkIn: { gt: membershipEnd, gte: windowStart } },
      select: { checkIn: true },
    });

    const distinctDates = new Set(
      expiredAtt.map((a) => toDateOnlyIST(a.checkIn).toISOString().slice(0, 10)),
    );
    if (distinctDates.size >= 2) {
      const sortedDates = [...distinctDates].sort().map((d) =>
        toDateOnlyIST(new Date(d)).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          timeZone: "Asia/Kolkata",
        }),
      );
      attendingRows.push({
        name: member.name,
        phone: member.phone,
        nextRenewalDate: member.nextRenewalDate,
        expiredCheckIns: distinctDates.size,
        checkInDates: sortedDates,
      });
    }
  }

  const message = formatReport(gymName, todayOverdue, attendingRows);
  return { message, todayOverdueCount: todayOverdue.length, attendingPatternCount: attendingRows.length };
}

export async function runDailyOverdueReport() {
  const gyms = await prisma.gym.findMany({ select: { id: true, name: true } });
  const reports: Array<{
    gymId: string;
    gymName: string;
    sent: boolean;
    todayOverdueCount: number;
    attendingPatternCount: number;
  }> = [];

  for (const gym of gyms) {
    const report = await buildGymReport(gym.id, gym.name);
    let sent = false;

    if (isMetaWabaConfigured() && ADMIN_PHONES.length > 0) {
      for (const phone of ADMIN_PHONES) {
        const result = await sendMetaWabaText(phone, report.message);
        if (result.ok) sent = true;
      }
    }

    reports.push({
      gymId: gym.id,
      gymName: gym.name,
      sent,
      todayOverdueCount: report.todayOverdueCount,
      attendingPatternCount: report.attendingPatternCount,
    });
  }

  logger.info(`daily-overdue-report gyms=${gyms.length}`);
  return { gyms: gyms.length, reports };
}
