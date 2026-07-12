import type {
  CreateMembershipInputDTO,
  MembershipDTO,
  MembershipMutationResultDTO,
  PlanDTO,
  RenewalCandidatesQueryDTO,
  RenewalCandidatesResultDTO,
} from "./types";

export type ListPlansOptions = {
  includeInactive?: boolean;
};

export interface IPlanQueries {
  listPlans(gymId: string, options?: ListPlansOptions): Promise<PlanDTO[]>;
  getPlan(gymId: string, planId: string): Promise<PlanDTO | null>;
}

export type UpdatePlanInputDTO = {
  name?: string;
  durationDays?: number;
  price?: number;
  description?: string | null;
  isActive?: boolean;
};

export interface IPlanCommands {
  updatePlan(
    gymId: string,
    planId: string,
    input: UpdatePlanInputDTO
  ): Promise<PlanDTO>;
  deactivatePlan(gymId: string, planId: string): Promise<PlanDTO>;
}

export interface IMembershipQueries {
  getCurrentMembership(memberId: string): Promise<MembershipDTO | null>;
  hasActiveMembership(memberId: string): Promise<boolean>;
}

/**
 * Ports for creation/extension — aligns with membership.service helpers.
 */
export interface IMembershipService extends IMembershipQueries {
  createOrExtendMembership(
    input: CreateMembershipInputDTO
  ): Promise<MembershipMutationResultDTO>;
  calculateMembershipEndDate(startDate: Date, durationDays: number): Date;
  shouldExtendMembership(
    memberId: string
  ): Promise<{ shouldExtend: boolean; currentEndDate?: Date }>;
}

export interface IRenewalReminderQueries {
  listReminderCandidates(
    gymId: string,
    query: RenewalCandidatesQueryDTO
  ): Promise<RenewalCandidatesResultDTO>;
}
