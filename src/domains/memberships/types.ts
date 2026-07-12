/**
 * Plans and membership periods — DTOs only.
 */

export interface PlanDTO {
  id: string;
  gymId: string;
  name: string;
  durationDays: number;
  price: number;
  description: string | null;
  isActive: boolean;
}

export interface MembershipDTO {
  id: string;
  memberId: string;
  gymId: string;
  planId: string;
  startDate: Date;
  endDate: Date;
  amount: number;
  createdAt: Date;
}

export interface CreateMembershipInputDTO {
  memberId: string;
  gymId: string;
  planId: string;
  amount: number;
  paymentDate: Date;
  duration?: string | null;
  userId: string;
}

export interface MembershipMutationResultDTO {
  membership: MembershipDTO;
  wasExtended: boolean;
  previousEndDate?: Date;
  newEndDate: Date;
}

export interface RenewalReminderCandidateDTO {
  id: string;
  name: string;
  phone: string;
  nextRenewalDate: string | null;
}

export interface RenewalCandidatesResultDTO {
  dueIn7Days: RenewalReminderCandidateDTO[];
  dueIn3Days: RenewalReminderCandidateDTO[];
  minDate: string;
  today: string;
}

export interface RenewalCandidatesQueryDTO {
  lookbackDays?: number;
  fromDate?: Date;
}
