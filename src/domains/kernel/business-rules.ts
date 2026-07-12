"use strict";

/**
 * Composes domain rule slices into BUSINESS_RULES (legacy aggregate shape).
 * Prefer importing the slice from the owning domain, e.g. `@/domains/payments/rules`.
 */

export { ATTENDANCE_RULES, WALK_IN_VISIT_RULES } from "@/domains/attendance/rules";
export { REMINDER_RULES } from "@/domains/communications/rules";
export { DATETIME_RULES, TIMEZONE_RULES } from "@/domains/kernel/datetime-rules";
export { RATE_LIMIT_RULES } from "@/domains/kernel/rate-limit-rules";
export { VALIDATION_RULES } from "@/domains/kernel/validation-rules";
export { MEMBER_PROTECTION_RULES } from "@/domains/identity/rules";
export { STATUS_RULES } from "@/domains/members/rules";
export { MEMBERSHIP_RULES, PLAN_RULES } from "@/domains/memberships/rules";
export { PAYMENT_RULES } from "@/domains/payments/rules";

import { ATTENDANCE_RULES, WALK_IN_VISIT_RULES } from "@/domains/attendance/rules";
import { REMINDER_RULES } from "@/domains/communications/rules";
import { DATETIME_RULES, TIMEZONE_RULES } from "@/domains/kernel/datetime-rules";
import { RATE_LIMIT_RULES } from "@/domains/kernel/rate-limit-rules";
import { VALIDATION_RULES } from "@/domains/kernel/validation-rules";
import { MEMBER_PROTECTION_RULES } from "@/domains/identity/rules";
import { STATUS_RULES } from "@/domains/members/rules";
import { MEMBERSHIP_RULES, PLAN_RULES } from "@/domains/memberships/rules";
import { PAYMENT_RULES } from "@/domains/payments/rules";

/** Frozen aggregate — same keys as historical BUSINESS_RULES */
export const BUSINESS_RULES = Object.freeze({
  MEMBERSHIP: MEMBERSHIP_RULES,
  PAYMENT: PAYMENT_RULES,
  DATETIME: DATETIME_RULES,
  MEMBER_PROTECTION: MEMBER_PROTECTION_RULES,
  STATUS: STATUS_RULES,
  REMINDER: REMINDER_RULES,
  TIMEZONE: TIMEZONE_RULES,
  VALIDATION: VALIDATION_RULES,
  PLAN: PLAN_RULES,
  ATTENDANCE: ATTENDANCE_RULES,
  WALK_IN_VISIT: WALK_IN_VISIT_RULES,
  RATE_LIMIT: RATE_LIMIT_RULES,
});

export type BusinessRules = typeof BUSINESS_RULES;

export function isValidStatusTransition(from: string, to: string): boolean {
  if (from === to) return true;
  const transitions: Record<string, readonly string[]> = BUSINESS_RULES.STATUS
    .VALID_TRANSITIONS as unknown as Record<string, readonly string[]>;
  const allowed = transitions[from];
  return allowed ? allowed.includes(to) : false;
}

export function requiresAudit(from: string, to: string): boolean {
  const transition = `${from}->${to}`;
  return (BUSINESS_RULES.STATUS.REQUIRE_AUDIT as readonly string[]).includes(transition);
}

export function getDuplicateThreshold(): number {
  return BUSINESS_RULES.PAYMENT.DUPLICATE_AMOUNT_THRESHOLD;
}

export function isDuplicateAmount(amount1: number, amount2: number): boolean {
  return (
    Math.abs(amount1 - amount2) <= BUSINESS_RULES.PAYMENT.DUPLICATE_AMOUNT_THRESHOLD
  );
}

export function isLikelySplitPaymentPair(a: number, b: number): boolean {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const maxPart = BUSINESS_RULES.PAYMENT.SPLIT_PAYMENT_MAX_SINGLE_PART;
  if (hi > maxPart || lo > maxPart) return false;
  const sum = a + b;
  const tol = BUSINESS_RULES.PAYMENT.SPLIT_PAYMENT_SUM_TOLERANCE_RUPEES;
  const targets = BUSINESS_RULES.PAYMENT.SPLIT_PAYMENT_SUM_TARGETS;
  return targets.some((T) => Math.abs(sum - T) <= tol);
}

export function shouldMergePaymentDuplicates(a: number, b: number): boolean {
  return isDuplicateAmount(a, b) && !isLikelySplitPaymentPair(a, b);
}

export function getMembershipDuration(durationType: string): number {
  const type = durationType.toUpperCase();
  if (type.includes("YEAR") || type.includes("12")) return BUSINESS_RULES.MEMBERSHIP.DURATIONS.YEARLY;
  if (type.includes("6") || type.includes("HALF")) return BUSINESS_RULES.MEMBERSHIP.DURATIONS.HALF_YEARLY;
  if (type.includes("3") || type.includes("QUARTER")) return BUSINESS_RULES.MEMBERSHIP.DURATIONS.QUARTERLY;
  return BUSINESS_RULES.MEMBERSHIP.DURATIONS.MONTHLY;
}
