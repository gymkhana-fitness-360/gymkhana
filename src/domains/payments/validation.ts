import { VALIDATION_RULES } from "@/domains/kernel/validation-rules";
import { PAYMENT_RULES } from "./rules";

export const PAYMENT_VALIDATION = {
  amount: VALIDATION_RULES.AMOUNT,
  payment: PAYMENT_RULES,
} as const;

export { validatePaymentAmount, validatePaymentCreateContext } from "@/lib/crud-business-validation";
