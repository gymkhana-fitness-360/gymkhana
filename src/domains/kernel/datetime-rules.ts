"use strict";

/** Kernel — global date/time policy */
export const DATETIME_RULES = Object.freeze({
  TIMEZONE: "Asia/Kolkata",
  DISPLAY_FORMAT: Object.freeze({
    DATES_ONLY: true,
    HIDE_TIME: true,
    DB_DATE_ONLY: true,
  }),
  TIMESTAMPS: Object.freeze({
    ALLOW_INTERNAL_CREATED_AT: true,
    NEVER_DISPLAY_CLOCK_TIME: true,
    PAYMENT_DATE_IS_CALENDAR_DATE: true,
  }),
});

/** Kernel — timezone constants */
export const TIMEZONE_RULES = Object.freeze({
  NAME: "Asia/Kolkata",
  OFFSET_HOURS: 5.5,
  OFFSET_MS: 5.5 * 60 * 60 * 1000,
});
