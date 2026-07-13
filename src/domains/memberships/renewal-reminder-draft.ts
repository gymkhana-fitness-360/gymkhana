import { formatSimpleReminderMessage } from "@/lib/templates/reminder-simple";
import { formatDate } from "@/lib/utils";
import { toDateOnlyIST, daysFromTodayIST } from "@/lib/date-only";

export type RenewalReminderDraftInput = {
  gymId: string;
  memberName: string;
  memberPhone: string;
  endDate: Date;
  planName?: string | null;
};

export type RenewalReminderDraft = {
  message: string;
  daysUntil: number;
  daysOverdue?: number;
  reminderType: "RENEWAL" | "OVERDUE";
  phone: string;
  validPhone: boolean;
};

/** Shared renewal/overdue WhatsApp draft builder (AUDIT-044). */
export async function buildRenewalReminderDraft(
  input: RenewalReminderDraftInput,
): Promise<RenewalReminderDraft> {
  const endDate = toDateOnlyIST(input.endDate);
  const daysUntil = -daysFromTodayIST(endDate);
  const daysOverdue = daysUntil < 0 ? Math.abs(daysUntil) : undefined;
  const phone = input.memberPhone?.replace(/\D/g, "") || "";

  const message = await formatSimpleReminderMessage({
    name: input.memberName,
    expiryDate: formatDate(input.endDate),
    daysLeft: daysUntil,
    daysOverdue,
    planName: input.planName ?? undefined,
    phoneNumber: phone,
    gymId: input.gymId,
  });

  return {
    message,
    daysUntil,
    daysOverdue,
    reminderType: daysOverdue ? "OVERDUE" : "RENEWAL",
    phone,
    validPhone: phone.length >= 10,
  };
}
