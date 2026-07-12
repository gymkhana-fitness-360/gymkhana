"use strict";

/** Cross-cutting validation limits (used by multiple domains) */
export const VALIDATION_RULES = Object.freeze({
  PHONE: Object.freeze({
    MIN_LENGTH: 10,
    MAX_LENGTH: 15,
    MUST_BE_UNIQUE: true,
  }),
  NAME: Object.freeze({
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
  }),
  AMOUNT: Object.freeze({
    MIN: 100,
    MAX: 50000,
    DECIMAL_PLACES: 2,
  }),
});
