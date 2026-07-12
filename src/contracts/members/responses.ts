import type { ApiMeta } from "../api-types";
import type { MemberStatusWire } from "../enums";

/** ISO date strings as returned over JSON. */
export interface MemberMembershipSummaryWire {
  endDate: string;
  plan: {
    name: string;
  };
}

export interface MemberListItemWire {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  status: MemberStatusWire;
  joinDate: string;
  memberships: MemberMembershipSummaryWire[];
}

export interface MemberResponse {
  id: string;
  name: string;
  phone: string;
  email?: string;
  status: MemberStatusWire;
  joinDate: string;
  membershipEndDate?: string;
  lastPaymentDate?: string;
  totalPaid?: number;
}

export interface MemberListResponse {
  members: MemberListItemWire[];
  meta: ApiMeta;
}
