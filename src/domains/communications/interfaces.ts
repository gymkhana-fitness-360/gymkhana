import type {
  CreateManualReminderInputDTO,
  MessageDTO,
  ReminderDTO,
  ReminderListFiltersDTO,
  ReminderListItemDTO,
  ReminderLogFiltersDTO,
  ReminderLogListResultDTO,
  ReminderUnpaidListResultDTO,
  SendWhatsAppDirectInputDTO,
  SendWhatsAppDirectResultDTO,
} from "./types";

export interface IMessageDispatcher {
  send(params: {
    gymId: string;
    memberId: string;
    templateKey: string;
    variables: Record<string, string>;
  }): Promise<MessageDTO>;
}

export interface IReminderService {
  scheduleRenewalReminders(gymId: string): Promise<ReminderDTO[]>;
  cancelReminder(reminderId: string, gymId: string): Promise<void>;
}

export interface IWhatsAppDirectMessaging {
  sendDirect(
    input: SendWhatsAppDirectInputDTO
  ): Promise<SendWhatsAppDirectResultDTO>;
}

export interface IManualReminderCommands {
  createReminder(
    gymId: string,
    input: CreateManualReminderInputDTO
  ): Promise<ReminderDTO>;
}

export interface IReminderListQueries {
  listReminders(
    gymId: string,
    filters: ReminderListFiltersDTO
  ): Promise<ReminderListItemDTO[]>;
}

export interface IReminderLogQueries {
  listReminderLogs(
    gymId: string,
    filters: ReminderLogFiltersDTO
  ): Promise<ReminderLogListResultDTO>;
}

export interface IReminderUnpaidQueries {
  listUnpaidAfterReminders(gymId: string): Promise<ReminderUnpaidListResultDTO>;
}
