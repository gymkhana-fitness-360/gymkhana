export {
  createOrExtendMembership,
  hasActiveMembership,
  getCurrentMembership,
  calculateMembershipEndDate,
  shouldExtendMembership,
} from "@/lib/services/membership.service";

export type { CreateMembershipInput, MembershipResult } from "@/lib/services/membership.service";
