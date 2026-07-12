import type { IMemberQueries, IMemberService } from "../interfaces";
import { PrismaMemberQueries } from "./prisma-member-queries";
import { MemberServiceAdapter } from "./member-service-adapter";

let memberQueries: IMemberQueries | null = null;
let memberService: IMemberService | null = null;

export function getMemberQueries(): IMemberQueries {
  if (!memberQueries) {
    memberQueries = new PrismaMemberQueries();
  }
  return memberQueries;
}

export function getMemberService(): IMemberService {
  if (!memberService) {
    memberService = new MemberServiceAdapter();
  }
  return memberService;
}

export { PrismaMemberQueries } from "./prisma-member-queries";
export { MemberServiceAdapter } from "./member-service-adapter";
