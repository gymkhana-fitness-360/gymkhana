export const LIFECYCLE_TEMPLATE_KEYS = [
  "expiring_soon",
  "before_1_day",
  "before_2_days",
  "expiry_day",
  "after_1_day",
  "after_7_days",
  "after_15_days",
  "after_1_month",
  "after_2_months_special",
] as const;

export type LifecycleTemplateKey = (typeof LIFECYCLE_TEMPLATE_KEYS)[number];

export interface LifecycleTemplateMeta {
  key: LifecycleTemplateKey;
  label: string;
  whenUsed: string;
  automated: boolean;
}

export interface LifecycleTemplateView extends LifecycleTemplateMeta {
  body: string;
  defaultBody: string;
  isCustom: boolean;
}

export interface LifecycleTemplateData {
  name: string;
  plan?: string;
  expiryDate: string;
  daysLeft: number;
  n?: number;
  daysWord?: string;
  checkInDate?: string;
}
