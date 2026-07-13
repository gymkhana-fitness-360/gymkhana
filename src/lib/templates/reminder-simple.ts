/**
 * Simple reminder template for renewals.
 * Delegates to editable lifecycle templates when gymId is provided.
 */
import {
  buildLifecycleTemplateData,
  pickLifecycleTemplateKey,
  resolveLifecycleMessage,
  renderLifecycleTemplate,
  getDefaultLifecycleBody,
} from "@/domains/communications/lifecycle-templates";
import { APP_NAME } from "@/lib/site-config";

export interface ReminderTemplateData {
  name: string;
  expiryDate: string;
  daysOverdue?: number;
  daysLeft?: number;
  planName?: string;
  phoneNumber: string;
  gymId?: string;
}

function legacyFormatSimpleReminderMessage(data: ReminderTemplateData): string {
  const { name, expiryDate, daysOverdue, phoneNumber } = data;

  if (daysOverdue && daysOverdue > 0) {
    return `⏰ *Membership Renewal Reminder*

Hi ${name},

Your membership expired on ${expiryDate} (${daysOverdue} days ago).

Please renew to continue your fitness journey.

📞 Contact: ${phoneNumber}
Team ${APP_NAME}

_We look forward to seeing you at the gym!_ 💪`;
  }

  return `⏰ *Membership Renewal Reminder*

Hi ${name},

Your membership is expiring on ${expiryDate}.

Please renew to continue your fitness journey.

📞 Contact: ${phoneNumber}
Team ${APP_NAME}

_Stay committed to your fitness goals!_ 💪`;
}

export function formatSimpleReminderMessageSync(data: ReminderTemplateData): string {
  const daysLeft =
    typeof data.daysLeft === "number"
      ? data.daysLeft
      : data.daysOverdue
        ? -data.daysOverdue
        : 0;

  const key = pickLifecycleTemplateKey(daysLeft);
  const templateData = buildLifecycleTemplateData({
    name: data.name,
    planName: data.planName,
    expiryDate: data.expiryDate,
    daysLeft,
  });

  return renderLifecycleTemplate(getDefaultLifecycleBody(key), templateData);
}

export async function formatSimpleReminderMessage(
  data: ReminderTemplateData,
): Promise<string> {
  const daysLeft =
    typeof data.daysLeft === "number"
      ? data.daysLeft
      : data.daysOverdue
        ? -data.daysOverdue
        : 0;

  const key = pickLifecycleTemplateKey(daysLeft);
  const templateData = buildLifecycleTemplateData({
    name: data.name,
    planName: data.planName,
    expiryDate: data.expiryDate,
    daysLeft,
  });

  if (data.gymId) {
    return resolveLifecycleMessage(data.gymId, key, templateData);
  }

  return renderLifecycleTemplate(getDefaultLifecycleBody(key), templateData);
}

/** @deprecated Use formatSimpleReminderMessage — kept for callers without async context */
export { legacyFormatSimpleReminderMessage };
