/**
 * Date validation for date-only fields (no time component).
 */

import { createLogger } from "@/lib/logger";

const logger = createLogger("date-validation");

export function validateDateOnly(date: Date, fieldName?: string): void {
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const seconds = date.getUTCSeconds();
  const ms = date.getUTCMilliseconds();

  if (hours !== 0 || minutes !== 0 || seconds !== 0 || ms !== 0) {
    const field = fieldName ? ` in field '${fieldName}'` : "";
    throw new Error(
      `Date-only field${field} has time component: ${date.toISOString()}. ` +
        `Use toDateOnlyIST() to strip time before saving.`
    );
  }
}

export function hasTimeComponent(date: Date): boolean {
  return (
    date.getUTCHours() !== 0 ||
    date.getUTCMinutes() !== 0 ||
    date.getUTCSeconds() !== 0 ||
    date.getUTCMilliseconds() !== 0
  );
}

export function validateDateOnlySoft(date: Date, fieldName?: string): void {
  if (hasTimeComponent(date)) {
    const field = fieldName ? ` in field '${fieldName}'` : "";
    logger.warn(`Date-only field${field} has time component: ${date.toISOString()}`);
  }
}

export function validateDateValue(date: Date, fieldName?: string): void {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    const field = fieldName ? ` '${fieldName}'` : "";
    throw new Error(`Invalid date${field}: ${String(date)}`);
  }

  if (!isFinite(date.getTime())) {
    const field = fieldName ? ` '${fieldName}'` : "";
    throw new Error(`Date${field} is Infinity: ${String(date)}`);
  }
}

export function validateDateRange(
  startDate: Date,
  endDate: Date,
  fieldNames?: { start: string; end: string }
): void {
  validateDateValue(startDate, fieldNames?.start);
  validateDateValue(endDate, fieldNames?.end);

  if (startDate.getTime() > endDate.getTime()) {
    const start = fieldNames?.start || "startDate";
    const end = fieldNames?.end || "endDate";
    throw new Error(`${start} must be before or equal to ${end}`);
  }
}
