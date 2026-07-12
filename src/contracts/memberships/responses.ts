import type { ApiMeta } from "../api-types";

export interface MembershipPlanSummaryWire {
  name: string;
}

export interface MembershipMemberSummaryWire {
  id?: string;
  name: string;
  phone: string;
  externalId?: string;
}

/** Row shape commonly returned from renewals and nested includes. */
export interface MembershipResponse {
  id: string;
  memberId: string;
  startDate: string;
  endDate: string;
  amount: number;
  Member: MembershipMemberSummaryWire;
  Plan: MembershipPlanSummaryWire;
}

export interface RenewalsBucketResponse {
  today: MembershipResponse[];
  thisWeek: MembershipResponse[];
  thisMonth: MembershipResponse[];
  pending10Days: MembershipResponse[];
  pending20Days: MembershipResponse[];
  totalDueThisMonth?: number;
}

export interface MembershipListResponse {
  memberships: MembershipResponse[];
  meta: ApiMeta;
}
