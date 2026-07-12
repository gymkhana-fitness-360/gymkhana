import type { Prisma } from "@prisma/client";

/**
 * Member domain DTOs — no Prisma types (except {@link MemberApiDetailDTO} for API parity).
 */

export const memberApiDetailInclude = {
  Membership: {
    include: { Plan: true },
    orderBy: { startDate: "desc" as const },
  },
  Payment: {
    include: { User: true },
    orderBy: { receivedAt: "desc" as const },
  },
  Reminder: {
    orderBy: { createdAt: "desc" as const },
    take: 10,
  },
} satisfies Prisma.MemberInclude;

export type MemberApiDetailDTO = Prisma.MemberGetPayload<{
  include: typeof memberApiDetailInclude;
}>;

export type MemberStatusValue = "ACTIVE" | "EXPIRED";

export interface MemberDTO {
  id: string;
  gymId: string;
  name: string;
  phone: string;
  email: string | null;
  gender: string | null;
  dateOfBirth: Date | null;
  address: string | null;
  emergencyContact: string | null;
  status: MemberStatusValue;
  joinDate: Date;
  source?: string | null;
  goal?: string | null;
  healthIssue?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  pincode?: string | null;
  photo?: string | null;
}

export interface UpdateMemberInput {
  name?: string;
  phone?: string;
  email?: string | null;
  gender?: string | null;
  dateOfBirth?: Date | null;
  address?: string | null;
  emergencyContact?: string | null;
  status?: MemberStatusValue;
  source?: string | null;
  goal?: string | null;
  healthIssue?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  pincode?: string | null;
  photo?: string | null;
}

/** Latest membership summary for lists and cards */
export interface MemberMembershipSummaryDTO {
  endDate: Date;
  planName: string;
  amount: number;
}

export type MemberExpiryFilterValue =
  | "expired_7"
  | "expired_30"
  | "expires_7"
  | "expires_30";

export interface MemberListItemDTO {
  id: string;
  name: string;
  phone: string;
  status: MemberStatusValue;
  joinDate: Date;
  latestMembership: MemberMembershipSummaryDTO | null;
}

export interface MemberPlanSummaryDTO {
  name: string;
  durationDays: number;
}

export interface MemberMembershipRowDTO {
  id: string;
  startDate: Date;
  endDate: Date;
  plan: MemberPlanSummaryDTO;
}

/** Detail view including membership history */
export interface MemberDetailDTO extends MemberDTO {
  memberships: MemberMembershipRowDTO[];
}

export interface ListMembersParams {
  gymId: string;
  search?: string;
  status?: MemberStatusValue;
  expiryFilter?: MemberExpiryFilterValue;
  excludeTestUsers?: boolean;
  sortBy?: string;
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface MembersOffsetPaginationDTO {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface MembersCursorDTO {
  nextCursor?: string;
  hasMore: boolean;
}

export type ListMembersResultDTO =
  | {
      members: MemberListItemDTO[];
      pagination: MembersOffsetPaginationDTO;
    }
  | {
      members: MemberListItemDTO[];
      cursor: MembersCursorDTO;
    };

export interface CreateMemberInput {
  gymId: string;
  name: string;
  phone: string;
  email?: string | null;
  gender?: string | null;
  dateOfBirth?: Date | null;
  address?: string | null;
  emergencyContact?: string | null;
}
