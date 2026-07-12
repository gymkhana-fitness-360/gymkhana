/**
 * Single import surface for API routes wiring domain ports (M0).
 */
export { getMemberQueries, getMemberService } from "@/domains/members/adapters";
export {
  getPlanQueries,
  getMembershipService,
  getRenewalReminderQueries,
} from "@/domains/memberships/adapters";
export {
  getWhatsAppDirectMessaging,
  getReminderLogQueries,
} from "@/domains/communications/adapters";
export { getPaymentQueries, getPaymentService } from "@/domains/payments/adapters";
export {
  getAttendanceService,
  getAttendanceQrService,
} from "@/domains/attendance/adapters";
export { listOpportunities, getChasePlan } from "@/domains/revenue-opportunities";
export { createSendReminderApproval, decideApproval } from "@/domains/approvals/service";
