/**
 * Utility functions for the application
 *
 * IMPORTANT: All user-visible dates use IST (Asia/Kolkata) and show calendar date only—no clock time.
 */

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

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
  const [year, month] = monthYearKey.split('-');
  const start = new Date(parseInt(year), parseInt(month) - 1, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
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
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Current month boundaries
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  currentMonthStart.setHours(0, 0, 0, 0);
  const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

  // Last month boundaries
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  lastMonthStart.setHours(0, 0, 0, 0);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);

  // Parse dates
  const paymentDate = latestPaymentDate ? (typeof latestPaymentDate === 'string' ? new Date(latestPaymentDate) : latestPaymentDate) : null;
  const endDate = typeof membershipEndDate === 'string' ? new Date(membershipEndDate) : membershipEndDate;
  endDate.setHours(0, 0, 0, 0);

  // If no payment exists, check membership end date
  if (!paymentDate) {
    const isValid = endDate >= today;
    return {
      isValid,
      reason: isValid 
        ? 'Valid based on membership end date (no payment records)' 
        : 'Expired - no payment records and membership end date has passed'
    };
  }

  paymentDate.setHours(0, 0, 0, 0);

  // Check if payment is in current month
  const isPaymentInCurrentMonth = paymentDate >= currentMonthStart && paymentDate <= currentMonthEnd;

  // Check if payment is in last month
  const isPaymentInLastMonth = paymentDate >= lastMonthStart && paymentDate <= lastMonthEnd;

  // If payment is in current month, membership is valid
  if (isPaymentInCurrentMonth) {
    return {
      isValid: true,
      reason: 'Valid - payment made in current month'
    };
  }

  // If payment is in last month, check membership end date
  if (isPaymentInLastMonth) {
    const isValid = endDate >= today;
    return {
      isValid,
      reason: isValid 
        ? 'Valid - payment made in last month and membership end date not expired' 
        : 'Expired - payment made in last month but membership end date has passed'
    };
  }

  // Payment is older than last month, check membership end date
  const isValid = endDate >= today;
  return {
    isValid,
    reason: isValid 
      ? `Valid - payment made ${Math.floor((today.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24))} days ago, but membership end date not expired` 
      : `Expired - payment made ${Math.floor((today.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24))} days ago and membership end date has passed`
  };
}
