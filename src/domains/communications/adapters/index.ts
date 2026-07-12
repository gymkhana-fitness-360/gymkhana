import type {
  IReminderLogQueries,
  IReminderUnpaidQueries,
  IWhatsAppDirectMessaging,
} from "../interfaces";
import { PrismaReminderLogQueries } from "./prisma-reminder-log-queries";
import { PrismaReminderUnpaidQueries } from "./prisma-reminder-unpaid-queries";
import { RoutingWhatsAppAdapter } from "./meta-waba-adapter";

let whatsAppDirect: IWhatsAppDirectMessaging | null = null;
let reminderLogQueries: IReminderLogQueries | null = null;
let reminderUnpaidQueries: IReminderUnpaidQueries | null = null;

export function getWhatsAppDirectMessaging(): IWhatsAppDirectMessaging {
  if (!whatsAppDirect) {
    whatsAppDirect = new RoutingWhatsAppAdapter();
  }
  return whatsAppDirect;
}

export function getReminderLogQueries(): IReminderLogQueries {
  if (!reminderLogQueries) {
    reminderLogQueries = new PrismaReminderLogQueries();
  }
  return reminderLogQueries;
}

export function getReminderUnpaidQueries(): IReminderUnpaidQueries {
  if (!reminderUnpaidQueries) {
    reminderUnpaidQueries = new PrismaReminderUnpaidQueries();
  }
  return reminderUnpaidQueries;
}

export { WhatsAppAdapter } from "./whatsapp-adapter";
export { RoutingWhatsAppAdapter } from "./meta-waba-adapter";
export { PrismaReminderLogQueries } from "./prisma-reminder-log-queries";
export { PrismaReminderUnpaidQueries } from "./prisma-reminder-unpaid-queries";
