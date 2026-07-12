/**
 * Membership lifecycle — delegates to BUSINESS_RULES so CI, schema, and runtime stay aligned.
 */

import type { MemberStatus } from "@prisma/client";
import { isValidStatusTransition } from "@/lib/business-rules";

export function validateStateTransition(
  from: MemberStatus,
  to: MemberStatus
): { valid: boolean; error?: string } {
  if (from === to) {
    return { valid: true };
  }
  if (!isValidStatusTransition(from, to)) {
    return {
      valid: false,
      error: `Invalid transition: ${from} -> ${to} (not allowed by business rules)`,
    };
  }
  return { valid: true };
}
