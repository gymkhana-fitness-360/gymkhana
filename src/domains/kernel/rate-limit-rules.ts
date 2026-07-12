"use strict";

/** Infrastructure — rate limits (API gateway style) */
export const RATE_LIMIT_RULES = Object.freeze({
  STRICT: Object.freeze({ requests: 10, window: 60 }),
  MODERATE: Object.freeze({ requests: 30, window: 60 }),
  LENIENT: Object.freeze({ requests: 100, window: 60 }),
});
