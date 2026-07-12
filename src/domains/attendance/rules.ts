"use strict";

/** Check-in / QR policy */
export const ATTENDANCE_RULES = Object.freeze({
  MAX_CHECKINS_PER_DAY: 2,
  AUTO_CHECKOUT_HOURS: 4,
  /** Mon–Sat operational; Sunday closed for call-list denominators */
  OPERATIONAL_WEEKDAYS: Object.freeze([1, 2, 3, 4, 5, 6] as const),
  /** Consecutive missed operational days before call-list inclusion */
  CALL_LIST_MISSED_OPERATIONAL_DAYS: 3,
  /** Members with membership ended within this many days still appear on attendance roster */
  GRACE_PERIOD_DAYS_AFTER_EXPIRY: 7,
  /** Bootstrap member list cap per gym per day */
  BOOTSTRAP_MEMBER_LIMIT: 2000,
});

/** Walk-in visitors: free trial (lifetime cap) or paid day pass */
export const WALK_IN_VISIT_RULES = Object.freeze({
  FREE_TRIAL_MAX_LIFETIME: 2,
  DAY_PASS_MIN_AMOUNT: 1,
  DAY_PASS_MAX_AMOUNT: 50000,
});
