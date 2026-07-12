/**
 * Simple reminder template for renewals.
 * Used when sending reminders from Renewals page.
 */
import { APP_NAME } from "@/lib/site-config";

export interface ReminderTemplateData {
  name: string;
  expiryDate: string;
  daysOverdue?: number;
  phoneNumber: string;
}

export function formatSimpleReminderMessage(data: ReminderTemplateData): string {
  const { name, expiryDate, daysOverdue, phoneNumber } = data;
  
  if (daysOverdue && daysOverdue > 0) {
    return `⏰ *Membership Renewal Reminder*

Hi ${name},

Your membership expired on ${expiryDate} (${daysOverdue} days ago).

Please renew to continue your fitness journey.

📞 Contact: 9831947879
Team ${APP_NAME}

_We look forward to seeing you at the gym!_ 💪`;
  }
  
  return `⏰ *Membership Renewal Reminder*

Hi ${name},

Your membership is expiring on ${expiryDate}.

Please renew to continue your fitness journey.

📞 Contact: 9831947879
Team ${APP_NAME}

_Stay committed to your fitness goals!_ 💪`;
}
