import { VALIDATION_RULES } from "@/domains/kernel/validation-rules";

export const MEMBER_VALIDATION = {
  phone: VALIDATION_RULES.PHONE,
  name: VALIDATION_RULES.NAME,
} as const;

export {
  validateMemberDisplayName,
  validateMemberPhoneDigits,
  assertMemberStatusTransition,
} from "@/lib/crud-business-validation";
