import type { ListParams } from "../api-types";

export type MessageChannelWire = "WHATSAPP" | "SMS" | "EMAIL" | "IN_APP";

/** `/api/whatsapp/send` */
export interface SendWhatsAppMessageRequest {
  phoneNumber: string;
  message: string;
  reminderId?: string;
  template?: string;
  templateData?: Record<string, unknown>;
}

/** `/api/whatsapp/send-template` */
export interface SendWhatsAppTemplateRequest {
  phone?: string;
  phoneNumber?: string;
  templateType: string;
  data?: Record<string, unknown>;
}

/** Domain-aligned manual reminder create (JSON body). */
export interface CreateManualReminderRequest {
  memberId: string;
  type: string;
  message: string;
  scheduledFor: string;
}

export interface ListRemindersRequest extends ListParams {
  status?: string;
  type?: string;
  limit?: number;
}
