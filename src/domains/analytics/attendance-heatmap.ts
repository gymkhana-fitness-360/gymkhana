import { prisma } from "@/lib/prisma";
import { addDaysIST, todayIST, toDateOnlyIST } from "@/domains/kernel/date-utils";

const IST_TZ = "Asia/Kolkata";
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type HeatmapCell = {
  dayOfWeek: number;
  dayLabel: string;
  hour: number;
  count: number;
};

export type AttendanceHeatmapResult = {
  period: { startDate: string; endDate: string; days: number };
  cells: HeatmapCell[];
  peak: { dayLabel: string; hour: number; count: number } | null;
  quiet: { dayLabel: string; hour: number; count: number } | null;
  totalCheckIns: number;
};

function istHour(d: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_TZ,
    hour: "numeric",
    hour12: false,
  }).formatToParts(d);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "0";
  return parseInt(hour, 10);
}

function istDayOfWeek(d: Date): number {
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: IST_TZ,
    weekday: "short",
  }).format(d);
  return DAY_LABELS.indexOf(wd);
}

export async function buildAttendanceHeatmap(
  gymId: string,
  days = 28,
): Promise<AttendanceHeatmapResult> {
  const end = todayIST();
  const start = addDaysIST(end, -(days - 1));

  const rows = await prisma.attendance.findMany({
    where: {
      gymId,
      checkIn: {
        gte: start,
        lt: addDaysIST(end, 1),
      },
    },
    select: { checkIn: true },
  });

  const grid = new Map<string, number>();
  for (let dow = 0; dow < 7; dow++) {
    for (let h = 5; h <= 22; h++) {
      grid.set(`${dow}-${h}`, 0);
    }
  }

  for (const row of rows) {
    const dow = istDayOfWeek(row.checkIn);
    const hour = istHour(row.checkIn);
    if (hour < 5 || hour > 22) continue;
    const key = `${dow}-${hour}`;
    grid.set(key, (grid.get(key) ?? 0) + 1);
  }

  const cells: HeatmapCell[] = [];
  let peak: HeatmapCell | null = null;
  let quiet: HeatmapCell | null = null;

  for (const [key, count] of grid.entries()) {
    const [dowStr, hourStr] = key.split("-");
    const dayOfWeek = parseInt(dowStr!, 10);
    const hour = parseInt(hourStr!, 10);
    const cell: HeatmapCell = {
      dayOfWeek,
      dayLabel: DAY_LABELS[dayOfWeek]!,
      hour,
      count,
    };
    cells.push(cell);
    if (!peak || count > peak.count) peak = cell;
    if (!quiet || count < quiet.count) quiet = cell;
  }

  cells.sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.hour - b.hour);

  return {
    period: {
      startDate: toDateOnlyIST(start).toISOString().slice(0, 10),
      endDate: toDateOnlyIST(end).toISOString().slice(0, 10),
      days,
    },
    cells,
    peak: peak && peak.count > 0 ? { dayLabel: peak.dayLabel, hour: peak.hour, count: peak.count } : null,
    quiet:
      quiet && rows.length > 0
        ? { dayLabel: quiet.dayLabel, hour: quiet.hour, count: quiet.count }
        : null,
    totalCheckIns: rows.length,
  };
}
