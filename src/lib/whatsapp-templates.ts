import { format } from 'date-fns';

export interface MemberInfo {
  name: string;
  phone: string;
  membershipEndDate?: Date;
  planName?: string;
}

export enum MessageTemplate {
  RENEWAL_REMINDER_3_DAYS = 'RENEWAL_REMINDER_3_DAYS',
  RENEWAL_REMINDER_7_DAYS = 'RENEWAL_REMINDER_7_DAYS',
  RENEWAL_REMINDER_15_DAYS = 'RENEWAL_REMINDER_15_DAYS',
  RENEWAL_OVERDUE = 'RENEWAL_OVERDUE',
  BIRTHDAY_WISH = 'BIRTHDAY_WISH',
  PAYMENT_CONFIRMATION = 'PAYMENT_CONFIRMATION',
  CUSTOM = 'CUSTOM',
}

/**
 * Generate WhatsApp message based on template and member info
 */
export function generateMessage(
  template: MessageTemplate,
  member: MemberInfo,
  customMessage?: string
): string {
  const { name, membershipEndDate, planName } = member;

  switch (template) {
    case MessageTemplate.RENEWAL_REMINDER_15_DAYS:
      return `Hi ${name}! 👋

This is a friendly reminder that your gym membership${planName ? ` (${planName})` : ''} will expire in 15 days (${membershipEndDate ? format(membershipEndDate, 'dd MMM yyyy') : 'soon'}).

Renew now to continue your fitness journey without interruption! 💪

Thank you for being part of our fitness family! 🏋️‍♂️`;

    case MessageTemplate.RENEWAL_REMINDER_7_DAYS:
      return `Hi ${name}! ⏰

Your gym membership${planName ? ` (${planName})` : ''} expires in 7 days (${membershipEndDate ? format(membershipEndDate, 'dd MMM yyyy') : 'soon'}).

Don't let your fitness goals pause! Renew today to keep the momentum going! 💪

Visit us or call to renew. 🏋️‍♂️`;

    case MessageTemplate.RENEWAL_REMINDER_3_DAYS:
      return `Hi ${name}! ⚠️

URGENT: Your gym membership${planName ? ` (${planName})` : ''} expires in just 3 days (${membershipEndDate ? format(membershipEndDate, 'dd MMM yyyy') : 'soon'})!

Renew now to avoid any interruption in your workout routine! 💪

We're here to help - contact us today! 🏋️‍♂️`;

    case MessageTemplate.RENEWAL_OVERDUE:
      return `Hi ${name}! ⚠️

Your gym membership${planName ? ` (${planName})` : ''} has expired on ${membershipEndDate ? format(membershipEndDate, 'dd MMM yyyy') : 'recently'}.

We miss you! Renew now to get back to your fitness goals! 💪

Contact us today to reactivate your membership. 🏋️‍♂️`;

    case MessageTemplate.BIRTHDAY_WISH:
      return `🎉 Happy Birthday ${name}! 🎂

Wishing you a fantastic day filled with joy and celebration! 🎈

Here's to another year of health, happiness, and amazing fitness achievements! 💪

Enjoy your special day! 🎁`;

    case MessageTemplate.PAYMENT_CONFIRMATION:
      return `Hi ${name}! ✅

Your payment has been successfully received! 

Thank you for your payment. Your membership${planName ? ` (${planName})` : ''} is now active.

Keep up the great work! 💪`;

    case MessageTemplate.CUSTOM:
      return customMessage || `Hi ${name}! 👋`;

    default:
      return `Hi ${name}! 👋`;
  }
}

/**
 * Format phone number for WhatsApp (remove +, spaces, etc.)
 */
export function formatPhoneForWhatsApp(phone: string): string {
  return phone.replace(/\D/g, '');
}
