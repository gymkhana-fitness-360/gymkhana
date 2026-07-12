import type { ListParams } from "../api-types";

export interface ListMembershipsRequest extends ListParams {
  memberId?: string;
  /** Filter by active window — server interprets vs today. */
  activeOnly?: boolean;
}

/** Body for `/api/renewals/send-reminder`. */
export interface SendRenewalReminderRequest {
  memberId: string;
  membershipId?: string;
}
