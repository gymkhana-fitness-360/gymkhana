import { addDaysIST, compareDateIST, toDateOnlyIST, todayIST } from "@/lib/date-only";
import { ATTENDANCE_RULES } from "@/domains/attendance/rules";

const OPERATIONAL_WEEKDAYS = ATTENDANCE_RULES.OPERATIONAL_WEEKDAYS;
export const CALL_LIST_MISSED_OPERATIONAL_DAYS = ATTENDANCE_RULES.CALL_LIST_MISSED_OPERATIONAL_DAYS;
export const ATTENDANCE_GRACE_PERIOD_DAYS = ATTENDANCE_RULES.GRACE_PERIOD_DAYS_AFTER_EXPIRY;

export function isoDateOnlyString(date: Date | string): string {
  const d = toDateOnlyIST(date);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isGymOperationalDayIST(date: Date | string): boolean {
  const dow = toDateOnlyIST(date).getUTCDay();
  return (OPERATIONAL_WEEKDAYS as readonly number[]).includes(dow);
}

export function getLastOperationalDaysIST(
  count: number = CALL_LIST_MISSED_OPERATIONAL_DAYS,
  anchor: Date = todayIST(),
): Date[] {
  const days: Date[] = [];
  let cursor = toDateOnlyIST(anchor);
  while (days.length < count) {
    if (isGymOperationalDayIST(cursor)) {
      days.push(new Date(cursor.getTime()));
    }
    cursor = addDaysIST(cursor, -1);
  }
  return days;
}

export function getLastOperationalDayYmdsIST(count?: number, anchor?: Date): string[] {
  return getLastOperationalDaysIST(count, anchor).map(isoDateOnlyString);
}

export function countOperationalDaysIST(start: Date | string, end: Date | string): number {
  let cursor = toDateOnlyIST(start);
  const endOnly = toDateOnlyIST(end);
  let n = 0;
  while (compareDateIST(cursor, endOnly) <= 0) {
    if (isGymOperationalDayIST(cursor)) n += 1;
    cursor = addDaysIST(cursor, 1);
  }
  return n;
}
