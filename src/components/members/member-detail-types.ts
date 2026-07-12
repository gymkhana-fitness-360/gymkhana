import type { MemberStatus } from "@prisma/client";

/** GYM-P1-008: shared types for member detail subcomponents */
export interface MemberDetailData {
  id: string;
  name: string;
  phone: string;
  gender: string | null;
  dateOfBirth: string | null;
  address: string | null;
  emergencyContact: string | null;
  status: MemberStatus;
  joinDate: string;
  externalId: string | null;
  Membership: Array<{
    id: string;
    startDate: string;
    endDate: string;
    amount: string;
    lifecycleStatus?: string;
    previousMembershipId?: string | null;
    Plan: {
      id: string;
      name: string;
      durationDays: number;
      price: string;
    };
  }>;
  Payment: Array<{
    id: string;
    amount: string;
    method: string;
    status: string;
    reference: string | null;
    notes: string | null;
    receivedAt: string;
    User: { name: string };
  }>;
}
