export type MessageChannel = "WHATSAPP" | "SMS" | "EMAIL" | "IN_APP";

export interface MessageDTO {
  id: string;
  gymId: string;
  memberId: string | null;
  channel: MessageChannel;
  templateKey: string;
  body: string;
  sentAt: Date | null;
  status: "QUEUED" | "SENT" | "FAILED";
}

export interface ReminderDTO {
  id: string;
  gymId: string;
  memberId: string;
  kind: "RENEWAL" | "OVERDUE" | "CUSTOM";
  scheduledFor: Date;
  status: "SCHEDULED" | "SENT" | "CANCELLED";
}

export interface SendWhatsAppDirectInputDTO {
  phoneNumber: string;
  message: string;
  gymId?: string;
  memberId?: string;
  reminderId?: string;
  template?: string;
  templateData?: Record<string, unknown>;
}

export interface SendWhatsAppDirectResultDTO {
  success: boolean;
  error?: string;
}

export interface CreateManualReminderInputDTO {
  memberId: string;
  type: string;
  message: string;
  scheduledFor: string;
}

export interface ReminderListItemDTO extends ReminderDTO {
  memberName: string;
  memberPhone: string;
}

export interface ReminderListFiltersDTO {
  status?: string;
  type?: string;
  limit?: number;
}

export interface ReminderLogFiltersDTO {
  days?: "7" | "30" | "all" | string;
  status?: "SENT" | "FAILED" | string;
}

export type ReminderLogListResultDTO = {
  logs: ReminderLogRowDTO[];
};

export type ReminderUnpaidItemDTO = {
  membership: {
    id: string;
    memberId: string;
    endDate: Date;
    amount: unknown;
  };
  member: { id: string; name: string; phone: string };
  plan: { name: string };
  lastReminded: Date | undefined;
};

export type ReminderUnpaidListResultDTO = {
  unpaid: ReminderUnpaidItemDTO[];
};

/** Matches GET /api/reminders/history response rows. */
export type ReminderLogRowDTO = {
  id: string;
  gymId: string;
  memberId: string;
  type: string;
  phoneNumber: string;
  message: string;
  sentAt: Date;
  status: string;
  error: string | null;
  sentBy: string;
  createdAt: Date;
  Member: {
    id: string;
    name: string;
    phone: string;
    status: string;
    Membership: { endDate: Date }[];
  };
  SentBy: { name: string };
};
