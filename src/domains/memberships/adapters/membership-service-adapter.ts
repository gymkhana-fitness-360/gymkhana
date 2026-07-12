import type { Membership } from "@prisma/client";
import {
  calculateMembershipEndDate as libCalculateMembershipEndDate,
  createOrExtendMembership,
  getCurrentMembership,
  hasActiveMembership,
  shouldExtendMembership,
} from "@/lib/services/membership.service";
import type { IMembershipService } from "../interfaces";
import type {
  CreateMembershipInputDTO,
  MembershipDTO,
  MembershipMutationResultDTO,
} from "../types";

function toMembershipDTO(m: Membership): MembershipDTO {
  return {
    id: m.id,
    memberId: m.memberId,
    gymId: m.gymId,
    planId: m.planId,
    startDate: m.startDate,
    endDate: m.endDate,
    amount: Number(m.amount),
    createdAt: m.createdAt,
  };
}

export class MembershipServiceAdapter implements IMembershipService {
  async getCurrentMembership(memberId: string): Promise<MembershipDTO | null> {
    const row = await getCurrentMembership(memberId);
    return row ? toMembershipDTO(row) : null;
  }

  hasActiveMembership(memberId: string): Promise<boolean> {
    return hasActiveMembership(memberId);
  }

  async createOrExtendMembership(
    input: CreateMembershipInputDTO
  ): Promise<MembershipMutationResultDTO> {
    const r = await createOrExtendMembership({
      memberId: input.memberId,
      gymId: input.gymId,
      planId: input.planId,
      amount: input.amount,
      paymentDate: input.paymentDate,
      duration: input.duration,
      userId: input.userId,
    });
    return {
      membership: toMembershipDTO(r.membership),
      wasExtended: r.wasExtended,
      previousEndDate: r.previousEndDate,
      newEndDate: r.newEndDate,
    };
  }

  calculateMembershipEndDate(startDate: Date, durationDays: number): Date {
    return libCalculateMembershipEndDate(startDate, durationDays);
  }

  shouldExtendMembership(memberId: string) {
    return shouldExtendMembership(memberId);
  }
}
