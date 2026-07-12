"use strict";

/** Member status lifecycle (derived from membership in places) */
export const STATUS_RULES = Object.freeze({
  VALID_TRANSITIONS: Object.freeze({
    ACTIVE: Object.freeze(["EXPIRED"]),
    EXPIRED: Object.freeze(["ACTIVE"]),
  }),
  REQUIRE_AUDIT: Object.freeze(["EXPIRED->ACTIVE"]),
  AUTO_UPDATE_STATUS: true,
  DETERMINATION: Object.freeze({
    HAS_VALID_MEMBERSHIP: "ACTIVE",
    HAS_EXPIRED_MEMBERSHIP: "EXPIRED",
    NO_MEMBERSHIP: "EXPIRED",
  }),
  QUERY_BY_MEMBERSHIP_NOT_STATUS: true,
});
