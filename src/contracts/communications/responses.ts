import type { MessageChannelWire } from "./requests";

export interface SendWhatsAppMessageResponse {
  sent: boolean;
  message: string;
}

export interface SendWhatsAppTemplateResponse {
  success: boolean;
  error?: string;
}

export interface SendRenewalReminderResponse {
  success: boolean;
  message: string;
  reminderLogId?: string;
}

export type MessageDeliveryStatusWire = "QUEUED" | "SENT" | "FAILED";

export interface MessageResponse {
  id: string;
  gymId: string;
  memberId: string | null;
  channel: MessageChannelWire;
  templateKey: string;
  body: string;
  sentAt: string | null;
  status: MessageDeliveryStatusWire;
}

export type ReminderKindWire = "RENEWAL" | "OVERDUE" | "CUSTOM";

export type ManualReminderStatusWire = "SCHEDULED" | "SENT" | "CANCELLED";

export interface ReminderResponse {
  id: string;
  gymId: string;
  memberId: string;
  kind: ReminderKindWire;
  scheduledFor: string;
  status: ManualReminderStatusWire;
}

export interface ReminderListItemResponse extends ReminderResponse {
  memberName: string;
  memberPhone: string;
}
