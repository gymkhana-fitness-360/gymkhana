"use strict";

/** Plans, renewals, duration */
export const MEMBERSHIP_RULES = Object.freeze({
  DURATIONS: Object.freeze({
    MONTHLY: 30,
    QUARTERLY: 90,
    HALF_YEARLY: 180,
    YEARLY: 365,
  }),
  DEFAULT_DURATION_DAYS: 30,
  GRACE_PERIOD_DAYS: 3,
  OVERDUE_TRACKING_DAYS: 7,
  EXTEND_FROM_CURRENT_END_DATE: true,
});

/** Plan catalog defaults */
export const PLAN_RULES = Object.freeze({
  DEFAULT_PLAN_ID: "monthly",
  REQUIRED_PLANS: Object.freeze([
    { id: "monthly-gym-699", name: "Monthly Gym 699", durationDays: 30, price: 699 },
    { id: "monthly-gym-799", name: "Monthly Gym 799", durationDays: 30, price: 799 },
    { id: "monthly-pt-2000", name: "Monthly PT 2000", durationDays: 30, price: 2000 },
    { id: "monthly-pt-1800", name: "Monthly PT 1800", durationDays: 30, price: 1800 },
    { id: "3-months-pt-1500", name: "3 Months PT 1500", durationDays: 90, price: 1500 },
    { id: "3-months-gym-2099", name: "3 Months Gym 2099", durationDays: 90, price: 2099 },
    { id: "6-months-gym-1799", name: "6 Months Gym 1799", durationDays: 180, price: 1799 },
  ]),
});
