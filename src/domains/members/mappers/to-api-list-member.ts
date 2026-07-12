import type { MemberListItemDTO } from "../types";

/**
 * Legacy API shape expected by dashboard SWR hooks (`Membership[0].Plan`).
 */
export function toApiListMember(item: MemberListItemDTO) {
  return {
    id: item.id,
    name: item.name,
    phone: item.phone,
    status: item.status,
    joinDate: item.joinDate,
    Membership: item.latestMembership
      ? [
          {
            endDate: item.latestMembership.endDate,
            amount: item.latestMembership.amount,
            Plan: { name: item.latestMembership.planName },
          },
        ]
      : [],
  };
}
