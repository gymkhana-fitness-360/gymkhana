import type {
  IMembershipService,
  IPlanCommands,
  IPlanQueries,
  IRenewalReminderQueries,
} from "../interfaces";
import { PrismaPlanQueries } from "./prisma-plan-queries";
import { PrismaRenewalReminderQueries } from "./prisma-renewal-queries";
import { MembershipServiceAdapter } from "./membership-service-adapter";

let planQueries: (IPlanQueries & IPlanCommands) | null = null;
let membershipService: IMembershipService | null = null;
let renewalQueries: IRenewalReminderQueries | null = null;

export function getPlanQueries(): IPlanQueries {
  if (!planQueries) {
    planQueries = new PrismaPlanQueries();
  }
  return planQueries;
}

export function getPlanCommands(): IPlanCommands {
  if (!planQueries) {
    planQueries = new PrismaPlanQueries();
  }
  return planQueries;
}

export function getMembershipService(): IMembershipService {
  if (!membershipService) {
    membershipService = new MembershipServiceAdapter();
  }
  return membershipService;
}

export function getRenewalReminderQueries(): IRenewalReminderQueries {
  if (!renewalQueries) {
    renewalQueries = new PrismaRenewalReminderQueries();
  }
  return renewalQueries;
}

export { PrismaPlanQueries } from "./prisma-plan-queries";
export { PrismaRenewalReminderQueries } from "./prisma-renewal-queries";
export { MembershipServiceAdapter } from "./membership-service-adapter";
