"use strict";

/** Billing, amounts, dedupe, splits */
export const PAYMENT_RULES = Object.freeze({
  DUPLICATE_AMOUNT_THRESHOLD: 2,
  DUPLICATE_IST_CALENDAR_DAY_SPAN: 3,
  SPLIT_PAYMENT_MAX_SINGLE_PART: 420,
  SPLIT_PAYMENT_SUM_TOLERANCE_RUPEES: 15,
  SPLIT_PAYMENT_SUM_TARGETS: Object.freeze([
    600, 700, 800, 900, 1000, 1500, 1800, 2000, 2200, 2600, 6700,
  ]),
  SPLIT_PAYMENT_WINDOW_MINUTES: 60,
  DUPLICATE_TIME_WINDOW_HOURS: 24,
  MIN_AMOUNT: 100,
  MAX_AMOUNT: 50000,
  AUTO_CREATE_MEMBERSHIP: true,
  AUTO_RESOLVE_OVERDUE: true,
  /** Window for global undo after admin payment delete (audit snapshot restore) */
  UNDO_DELETE_TTL_MS: 30 * 60 * 1000,
  DUPLICATE_DETECTION: Object.freeze({
    CHECK_EXACT_MATCH: true,
    CHECK_NEAR_MATCH: true,
    EXCLUDE_FROM_REPORTS: true,
    SOFT_DELETE: true,
  }),
});
