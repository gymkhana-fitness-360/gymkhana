import { APP_NAME } from "@/lib/site-config";
import type { LifecycleTemplateKey, LifecycleTemplateMeta } from "./types";

export const LIFECYCLE_TEMPLATE_META: Record<LifecycleTemplateKey, LifecycleTemplateMeta> = {
  expiring_soon: {
    key: "expiring_soon",
    label: "Expiring soon (3+ days)",
    whenUsed: "Manual reminders from the member list when expiry is still several days away",
    automated: false,
  },
  before_1_day: {
    key: "before_1_day",
    label: "1 day before expiry",
    whenUsed: "Manual renewal nudges the day before membership ends",
    automated: false,
  },
  before_2_days: {
    key: "before_2_days",
    label: "2 days before expiry",
    whenUsed: "Sent automatically by the daily lifecycle schedule",
    automated: true,
  },
  expiry_day: {
    key: "expiry_day",
    label: "Expiry day",
    whenUsed: "Sent automatically on the membership end date",
    automated: true,
  },
  after_1_day: {
    key: "after_1_day",
    label: "1 day after expiry",
    whenUsed: "Sent automatically one day after membership ends",
    automated: true,
  },
  after_7_days: {
    key: "after_7_days",
    label: "7 days after expiry",
    whenUsed: "Sent automatically one week after membership ends (win-back)",
    automated: true,
  },
  after_15_days: {
    key: "after_15_days",
    label: "15 days after expiry",
    whenUsed: "Sent automatically fifteen days after membership ends",
    automated: true,
  },
  after_1_month: {
    key: "after_1_month",
    label: "1 month after expiry",
    whenUsed: "Sent automatically about one month after membership ends",
    automated: true,
  },
  after_2_months_special: {
    key: "after_2_months_special",
    label: "2 months after expiry (special offer)",
    whenUsed: "Sent automatically about two months after expiry with a comeback offer",
    automated: true,
  },
};

export const DEFAULT_LIFECYCLE_TEMPLATE_BODIES: Record<LifecycleTemplateKey, string> = {
  expiring_soon: `Hi {{name}}! 👋

Your *{{plan}}* membership ends on *{{expiryDate}}* ({{n}} {{daysWord}} left).

Renew early to keep your routine uninterrupted. 💪

Team ${APP_NAME}`,

  before_1_day: `Hi {{name}}! ⏰

Reminder: your *{{plan}}* membership expires *tomorrow* ({{expiryDate}}).

Visit the front desk or reply here to renew. 🏋️‍♂️

Team ${APP_NAME}`,

  before_2_days: `Hi {{name}}! 👋

Your *{{plan}}* membership expires in *2 days* on {{expiryDate}}.

Renew now to avoid a break in access. 💪

Team ${APP_NAME}`,

  expiry_day: `Hi {{name}}! ⚠️

Your *{{plan}}* membership ends *today* ({{expiryDate}}).

Renew today to stay active. We're here to help! 🏋️‍♂️

Team ${APP_NAME}`,

  after_1_day: `Hi {{name}}! 👋

Your membership expired yesterday ({{expiryDate}}). We miss you already!

Renew anytime to pick up where you left off. 💪

Team ${APP_NAME}`,

  after_7_days: `Hi {{name}}! 👋

It's been a week since your membership ended on {{expiryDate}}.

Ready to come back? Renew today and restart your fitness journey. 🏋️‍♂️

Team ${APP_NAME}`,

  after_15_days: `Hi {{name}}! 👋

Your membership expired on {{expiryDate}} — it's been about two weeks.

We'd love to see you again. Reply or visit us to renew. 💪

Team ${APP_NAME}`,

  after_1_month: `Hi {{name}}! 👋

It's been about a month since your membership ended ({{expiryDate}}).

Your goals are still within reach — renew when you're ready. 🏋️‍♂️

Team ${APP_NAME}`,

  after_2_months_special: `Hi {{name}}! 🎉

We miss you at the gym! Your membership ended on {{expiryDate}}.

*Special comeback offer* — ask at the front desk about renewing this week. 💪

Team ${APP_NAME}`,
};

export function lifecycleTemplateSettingKey(key: LifecycleTemplateKey, gymId: string) {
  return `wa_lifecycle_tpl:${key}:${gymId}`;
}
