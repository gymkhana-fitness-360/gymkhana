import { MemberService as LibMemberService } from "@/lib/services/member.service";
import type { UpdateMemberInput as LibUpdateMemberInput } from "@/lib/services/member.service";
import type { Member } from "@prisma/client";
import type { IMemberService } from "../interfaces";
import type { MemberDTO, UpdateMemberInput } from "../types";
import { PrismaMemberQueries } from "./prisma-member-queries";

function toMemberDTO(m: Member): MemberDTO {
  return {
    id: m.id,
    gymId: m.gymId,
    name: m.name,
    phone: m.phone,
    email: m.email ?? null,
    gender: m.gender ?? null,
    dateOfBirth: m.dateOfBirth,
    address: m.address,
    emergencyContact: m.emergencyContact,
    status: m.status,
    joinDate: m.joinDate,
    source: m.source ?? null,
    goal: m.goal ?? null,
    healthIssue: m.healthIssue ?? null,
    country: m.country ?? null,
    state: m.state ?? null,
    city: m.city ?? null,
    pincode: m.pincode ?? null,
  };
}

/**
 * Write operations via {@link LibMemberService}; reads default to {@link PrismaMemberQueries}.
 */
export class MemberServiceAdapter implements IMemberService {
  constructor(private readonly queries = new PrismaMemberQueries()) {}

  phoneExists(
    phone: string,
    gymId: string,
    excludeMemberId?: string
  ): Promise<boolean> {
    return this.queries.phoneExists(phone, gymId, excludeMemberId);
  }

  getMemberById(id: string, gymId: string) {
    return this.queries.getMemberById(id, gymId);
  }

  getMemberApiDetail(id: string, gymId: string) {
    return this.queries.getMemberApiDetail(id, gymId);
  }

  listMembers(params: Parameters<IMemberService["listMembers"]>[0]) {
    return this.queries.listMembers(params);
  }

  async updateMember(
    id: string,
    gymId: string,
    input: UpdateMemberInput
  ): Promise<MemberDTO> {
    const updated = await LibMemberService.updateMember(
      id,
      gymId,
      input as LibUpdateMemberInput
    );
    return toMemberDTO(updated);
  }

  async deleteMember(id: string, gymId: string): Promise<MemberDTO> {
    const updated = await LibMemberService.deleteMember(id, gymId);
    return toMemberDTO(updated);
  }
}
