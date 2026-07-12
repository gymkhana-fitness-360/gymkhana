/**
 * Date-only utilities for consistent calendar date handling (IST).
 *
 * IMPORTANT: All dates in this application use IST (India/Kolkata UTC+5:30) by default.
 * - Dates stored as DATE in PostgreSQL (no time component)
 * - Calculations use IST via Intl (no manual offset math)
 *
 * Use the simplified exports (today, toDateOnly, etc.) for new code.
 * IST-suffixed names are kept for backward compatibility.
 */

"use strict";

const IST_TZ = "Asia/Kolkata";

export function todayIST(): Date {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.format(new Date()).split("-");
  return new Date(
    Date.UTC(
      parseInt(parts[0], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[2], 10),
      0,
      0,
      0,
      0
    )
  );
}

export function toDateOnlyIST(input: Date | string): Date {
  if (typeof input === "string") {
    const [year, month, day] = input.split("T")[0].split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.format(input).split("-");
  return new Date(
    Date.UTC(
      parseInt(parts[0], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[2], 10),
      0,
      0,
      0,
      0
    )
  );
}

export function addDaysIST(date: Date | string, days: number): Date {
  const d = toDateOnlyIST(date);
  const result = new Date(d);
  result.setUTCDate(result.getUTCDate() + days);
  return toDateOnlyIST(result);
}

export function compareDateIST(a: Date | string, b: Date | string): number {
  const dateA = toDateOnlyIST(a).getTime();
  const dateB = toDateOnlyIST(b).getTime();
  return dateA < dateB ? -1 : dateA > dateB ? 1 : 0;
}

/** Whole IST calendar days between two dates (0 = same IST day). */
export function calendarDaysApartIST(a: Date | string, b: Date | string): number {
  const da = toDateOnlyIST(a);
  const db = toDateOnlyIST(b);
  return Math.round(Math.abs(da.getTime() - db.getTime()) / 86_400_000);
}

export function daysFromTodayIST(target: Date | string): number {
  const today = todayIST().getTime();
  const targetDate = toDateOnlyIST(target).getTime();
  return Math.floor((targetDate - today) / (1000 * 60 * 60 * 24));
}

export function dateFromParts(year: number, month1to12: number, day: number): Date {
  return new Date(Date.UTC(year, month1to12 - 1, day, 0, 0, 0, 0));
}

export function startOfDayIST(date?: Date | string): Date {
  return toDateOnlyIST(date || new Date());
}

export function endOfDayIST(date?: Date | string): Date {
  const start = toDateOnlyIST(date || new Date());
  const end = new Date(start);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

export const today = todayIST;
export const toDateOnly = toDateOnlyIST;
export const addDays = addDaysIST;
export const compareDate = compareDateIST;
export const daysFromToday = daysFromTodayIST;
export const startOfDay = startOfDayIST;
export const endOfDay = endOfDayIST;

export const todayDateOnlyUTC = todayIST;
export const toDateOnlyUTC = toDateOnlyIST;
export const addDaysDateOnlyUTC = addDaysIST;
export const compareDateOnlyUTC = compareDateIST;
export const daysFromTodayUTC = daysFromTodayIST;
