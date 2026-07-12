"use strict";

/**
 * CRUD business validation — single gate aligned with BUSINESS_RULES and Prisma DATE-only storage.
 * Use before any payment/member write so API, services, and DB semantics stay consistent.
 */

import { toDateOnlyIST } from "@/lib/date-only";
import { BUSINESS_RULES, isValidStatusTransition } from "@/lib/business-rules";
import type { MemberStatus, WalkInVisitKind } from "@prisma/client";

export class BusinessRuleViolation extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "BusinessRuleViolation";
    this.code = code;
  }
}

/** Normalize any input to a calendar date for @db.Date columns (IST). */
export function normalizeStorageCalendarDate(d: Date | string): Date {
  return toDateOnlyIST(d);
}

export function validatePaymentAmount(
  amount: number,
  options?: { allowBelowMinimum?: boolean }
): void {
  if (typeof amount !== "number" || Number.isNaN(amount)) {
    throw new BusinessRuleViolation("PAYMENT_AMOUNT_INVALID", "Payment amount must be a number");
  }
  if (amount < 0) {
    throw new BusinessRuleViolation("PAYMENT_AMOUNT_NEGATIVE", "Payment amount cannot be negative");
  }
  const { MIN_AMOUNT, MAX_AMOUNT } = BUSINESS_RULES.PAYMENT;
  if (amount > MAX_AMOUNT) {
    throw new BusinessRuleViolation(
      "PAYMENT_AMOUNT_OUT_OF_RANGE",
      `Invalid amount: ₹${amount}. Maximum is ₹${MAX_AMOUNT}`
    );
  }
  if (!options?.allowBelowMinimum && amount < MIN_AMOUNT) {
    throw new BusinessRuleViolation(
      "PAYMENT_AMOUNT_OUT_OF_RANGE",
      `Invalid amount: ₹${amount}. Must be between ₹${MIN_AMOUNT} and ₹${MAX_AMOUNT}`
    );
  }
}

export function validateMemberPhoneDigits(phone: string): void {
  const digits = phone.replace(/\D/g, "");
  const { MIN_LENGTH, MAX_LENGTH } = BUSINESS_RULES.VALIDATION.PHONE;
  if (digits.length < MIN_LENGTH || digits.length > MAX_LENGTH) {
    throw new BusinessRuleViolation(
      "PHONE_INVALID_LENGTH",
      `Phone must be ${MIN_LENGTH}–${MAX_LENGTH} digits (after stripping non-digits)`
    );
  }
}

export function validateMemberDisplayName(name: string): void {
  const n = (name || "").trim();
  const { MIN_LENGTH, MAX_LENGTH } = BUSINESS_RULES.VALIDATION.NAME;
  if (n.length < MIN_LENGTH || n.length > MAX_LENGTH) {
    throw new BusinessRuleViolation(
      "NAME_INVALID",
      `Name length must be between ${MIN_LENGTH} and ${MAX_LENGTH}`
    );
  }
}

export function assertMemberStatusTransition(from: MemberStatus, to: MemberStatus): void {
  if (!isValidStatusTransition(from, to)) {
    throw new BusinessRuleViolation(
      "STATUS_TRANSITION_INVALID",
      `Status change ${from} → ${to} is not allowed by business rules`
    );
  }
}

/** Synchronous checks for payment creation (amount + calendar date). */
export function validatePaymentCreateContext(input: {
  amount: number;
  paymentDate: Date | string;
  /** Set when persisting non-completed ledger rows (e.g. failed UPI sync). */
  allowBelowMinimumAmount?: boolean;
}): { calendarDate: Date } {
  validatePaymentAmount(input.amount, {
    allowBelowMinimum: input.allowBelowMinimumAmount,
  });
  const calendarDate = normalizeStorageCalendarDate(input.paymentDate);
  return { calendarDate };
}

export function validateWalkInVisitAmount(
  kind: WalkInVisitKind,
  amount: number | null | undefined
): void {
  const { DAY_PASS_MIN_AMOUNT, DAY_PASS_MAX_AMOUNT } = BUSINESS_RULES.WALK_IN_VISIT;
  if (kind === "FREE_TRIAL") {
    if (amount != null && amount !== 0) {
      throw new BusinessRuleViolation(
        "FREE_TRIAL_NO_AMOUNT",
        "Free trial visits cannot include a payment amount"
      );
    }
    return;
  }
  if (kind === "DAY_PASS") {
    if (amount == null || Number.isNaN(amount)) {
      throw new BusinessRuleViolation("DAY_PASS_AMOUNT_REQUIRED", "Day pass amount is required");
    }
    if (amount < DAY_PASS_MIN_AMOUNT || amount > DAY_PASS_MAX_AMOUNT) {
      throw new BusinessRuleViolation(
        "DAY_PASS_AMOUNT_OUT_OF_RANGE",
        `Day pass amount must be between ₹${DAY_PASS_MIN_AMOUNT} and ₹${DAY_PASS_MAX_AMOUNT}`
      );
    }
  }
}

export function assertFreeTrialLifetimeAllowed(existingFreeTrialCount: number): void {
  const max = BUSINESS_RULES.WALK_IN_VISIT.FREE_TRIAL_MAX_LIFETIME;
  if (existingFreeTrialCount >= max) {
    throw new BusinessRuleViolation(
      "FREE_TRIAL_LIMIT_REACHED",
      `This phone has already used ${max} free trial(s) (lifetime maximum)`
    );
  }
}
