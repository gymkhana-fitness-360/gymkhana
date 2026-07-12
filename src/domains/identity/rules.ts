"use strict";

/** Identity / member protection */
export const MEMBER_PROTECTION_RULES = Object.freeze({
  ID_PREFIX: "MEM-",
  ID_PATTERN: /^MEM-\d+$/,
  ADMIN_IDS: Object.freeze(["MEM000", "MEMXXX"]),
  ADMIN_PHONE_MAP: Object.freeze({} as Record<string, string>),
  PROTECTED_FIELDS: Object.freeze(["id", "phone", "joinDate"]),
});
