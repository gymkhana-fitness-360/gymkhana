/**
 * Stable keys for reminder / WhatsApp templates — wire to real copy in infra layer.
 */
export const RENEWAL_TEMPLATE_KEYS = {
  days7: "renewal.7_days",
  days3: "renewal.3_days",
  day1: "renewal.1_day",
} as const;

export const OVERDUE_TEMPLATE_KEYS = {
  day1: "overdue.1_day",
  day3: "overdue.3_days",
  day7: "overdue.7_days",
} as const;
