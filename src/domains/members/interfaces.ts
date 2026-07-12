import type {
  CreateMemberInput,
  ListMembersParams,
  ListMembersResultDTO,
  MemberApiDetailDTO,
  MemberDetailDTO,
  MemberDTO,
  UpdateMemberInput,
} from "./types";

/**
 * Read-side port for members (queries / projections).
 */
export interface IMemberQueries {
  phoneExists(phone: string, gymId: string, excludeMemberId?: string): Promise<boolean>;
  getMemberById(id: string, gymId: string): Promise<MemberDetailDTO | null>;
  /** Full dashboard detail (memberships, payments, reminders). */
  getMemberApiDetail(id: string, gymId: string): Promise<MemberApiDetailDTO | null>;
  listMembers(params: ListMembersParams): Promise<ListMembersResultDTO>;
}

/**
 * Write-side + queries — mirrors {@link import("@/lib/services/member.service") MemberService} responsibilities.
 * Implementations may still return Prisma-shaped rows until mappers are introduced.
 */
export interface IMemberService extends IMemberQueries {
  updateMember(id: string, gymId: string, input: UpdateMemberInput): Promise<MemberDTO>;
  deleteMember(id: string, gymId: string): Promise<MemberDTO>;
  /** Optional — admissions flow may live in a separate bounded context */
  createMember?(input: CreateMemberInput): Promise<MemberDTO>;
}
