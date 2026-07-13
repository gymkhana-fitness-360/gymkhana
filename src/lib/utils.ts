/**
 * Utility functions for the application
 *
 * IMPORTANT: All user-visible dates use IST (Asia/Kolkata) and show calendar date only—no clock time.
 */

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { compareDateIST, dateFromParts, endOfDayIST, todayIST, toDateOnlyIST, addDaysIST, calendarDaysApartIST } from "@/lib/date-only"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely extract error message from unknown error type.
 * Use this instead of manual instanceof checks.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unexpected error occurred";
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Handle invalid/NaN/Infinity values
  if (isNaN(num) || num === null || num === undefined || !isFinite(num)) {
    return '₹0';
  }
  
  // Format number with Indian number formatting (lakhs, crores style)
  const formattedNumber = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
  
  // Always prefix with ₹ symbol
  return `₹${formattedNumber}`;
}

/** Format date in IST timezone (all dates are IST by default) */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(d);
}

export function getDaysUntil(date: Date | string): number {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  
  const todayParts = formatter.format(new Date()).split('-');
  const today = new Date(Date.UTC(
    parseInt(todayParts[0]),
    parseInt(todayParts[1]) - 1,
    parseInt(todayParts[2]),
    0, 0, 0, 0
  ));
  
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const targetParts = formatter.format(targetDate).split('-');
  const target = new Date(Date.UTC(
    parseInt(targetParts[0]),
    parseInt(targetParts[1]) - 1,
    parseInt(targetParts[2]),
    0, 0, 0, 0
  ));
  
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function isExpiringSoon(endDate: Date | string, daysThreshold: number = 7): boolean {
  const daysUntil = getDaysUntil(endDate);
  return daysUntil >= 0 && daysUntil <= daysThreshold;
}

export function isExpired(endDate: Date | string): boolean {
  return getDaysUntil(endDate) < 0;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function formatPhone(phone: string): string {
  // Format Indian phone numbers: +91 98765 43210
  if (phone.startsWith('+91')) {
    const number = phone.slice(3);
    return `+91 ${number.slice(0, 5)} ${number.slice(5)}`;
  }
  return phone;
}

export function getMonthYearKey(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-12
  return `${year}-${month.toString().padStart(2, '0')}`;
}

export function formatMonthYear(monthYearKey: string): string {
  const [year, month] = monthYearKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return new Intl.DateTimeFormat('en-IN', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function getMonthStartEnd(monthYearKey: string): { start: Date; end: Date } {
  const [year, month] = monthYearKey.split('-').map(Number);
  const start = dateFromParts(year, month, 1);
  const end = endOfDayIST(
    addDaysIST(month === 12 ? dateFromParts(year + 1, 1, 1) : dateFromParts(year, month + 1, 1), -1),
  );
  return { start, end };
}

/**
 * Calculate membership validity by comparing payment date of last month vs current month
 * @param latestPaymentDate - The date of the most recent payment
 * @param membershipEndDate - The membership end date
 * @returns Object with isValid boolean and reason string
 */
export function calculateMembershipValidity(
  latestPaymentDate: Date | string | null | undefined,
  membershipEndDate: Date | string
): { isValid: boolean; reason: string } {
  const today = todayIST();

  const y = today.getUTCFullYear();
  const m = today.getUTCMonth() + 1;
  const currentMonthStart = dateFromParts(y, m, 1);
  const currentMonthEnd = endOfDayIST(
    addDaysIST(m === 12 ? dateFromParts(y + 1, 1, 1) : dateFromParts(y, m + 1, 1), -1),
  );
  const lastMonth = m === 1 ? 12 : m - 1;
  const lastYear = m === 1 ? y - 1 : y;
  const lastMonthStart = dateFromParts(lastYear, lastMonth, 1);
  const lastMonthEnd = endOfDayIST(
    addDaysIST(lastMonth === 12 ? dateFromParts(lastYear + 1, 1, 1) : dateFromParts(lastYear, lastMonth + 1, 1), -1),
  );

  const paymentDate = latestPaymentDate ? toDateOnlyIST(latestPaymentDate) : null;
  const endDate = toDateOnlyIST(membershipEndDate);

  if (!paymentDate) {
    const isValid = compareDateIST(endDate, today) >= 0;
    return {
      isValid,
      reason: isValid
        ? 'Valid based on membership end date (no payment records)'
        : 'Expired - no payment records and membership end date has passed'
    };
  }

  const isPaymentInCurrentMonth =
    compareDateIST(paymentDate, currentMonthStart) >= 0 &&
    compareDateIST(paymentDate, currentMonthEnd) <= 0;

  const isPaymentInLastMonth =
    compareDateIST(paymentDate, lastMonthStart) >= 0 &&
    compareDateIST(paymentDate, lastMonthEnd) <= 0;

  if (isPaymentInCurrentMonth) {
    return {
      isValid: true,
      reason: 'Valid - payment made in current month'
    };
  }

  if (isPaymentInLastMonth) {
    const isValid = compareDateIST(endDate, today) >= 0;
    return {
      isValid,
      reason: isValid
        ? 'Valid - payment made in last month and membership end date not expired'
        : 'Expired - payment made in last month but membership end date has passed'
    };
  }

  const isValid = compareDateIST(endDate, today) >= 0;
  const daysAgo = calendarDaysApartIST(today, paymentDate);
  return {
    isValid,
    reason: isValid
      ? `Valid - payment made ${daysAgo} days ago, but membership end date not expired`
      : `Expired - payment made ${daysAgo} days ago and membership end date has passed`
  };
}
