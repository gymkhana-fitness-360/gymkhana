import { z } from "zod";
import { buildAttendanceHeatmap } from "@/domains/analytics/attendance-heatmap";
import { listActiveTrials } from "@/domains/trials/active-trials";
import { getTrainerLeaderboard } from "@/domains/trainers/leaderboard";
import { getMemberInsights } from "@/domains/members/member-insights";
import { getPaymentTimingInsights } from "@/domains/payments/payment-timing-insights";
import { createOffer, listOffers } from "@/domains/offers/service";
import {
  createMembershipForMember,
  cancelMembershipForGym,
} from "@/domains/memberships/membership-lifecycle";
import { convertTrialToMember } from "@/domains/trials/convert-trial";
import { listProducts } from "@/domains/commerce/products";
import { createOrderLine } from "@/domains/commerce/order-lines";
import { listSupplementRepurchaseCandidates } from "@/domains/commerce/supplement-nudge";
import { getTrainerPerformance } from "@/domains/trainers/performance";
import { applyPtDiscount } from "@/domains/offers/pt-discount";
import { suggestPaymentOptions } from "@/domains/payments/suggest-payment-options";
import { createPtRevenueGoal } from "@/domains/goals/service";
import {
  createLead,
  listLeads,
  listLeadsDueForFollowUp,
  updateLead,
  convertLeadToTrial,
} from "@/domains/leads/service";
import { getOperatingHoursFact } from "@/domains/analytics/operating-hours-fact";
import { todayIST, addDaysIST } from "@/lib/date-only";
import { registerTool, ToolExecutionError } from "./registry";
import { prisma } from "@/lib/prisma";
import { formatSimpleReminderMessage } from "@/lib/templates/reminder-simple";
import { formatDate, formatCurrency } from "@/lib/utils";
import { toDateOnlyIST, daysFromTodayIST } from "@/lib/date-only";

export function registerExpansionTools() {
  registerTool({
    name: "getAttendanceHeatmap",
    description: "Hour × day check-in density for the gym (IST)",
    schema: z.object({ days: z.number().int().min(7).max(90).optional() }),
    agentScopes: ["read:analytics"],
    audit: "none",
    handler: async (ctx, input) => buildAttendanceHeatmap(ctx.gymId, input.days ?? 28),
  });

  registerTool({
    name: "listActiveTrials",
    description: "Recent free trials and open conversion candidates",
    schema: z.object({ days: z.number().int().min(1).max(60).optional() }),
    agentScopes: ["read:members"],
    audit: "none",
    handler: async (ctx, input) => listActiveTrials(ctx.gymId, input.days ?? 14),
  });

  registerTool({
    name: "getTrainerLeaderboard",
    description: "Trainer ranking by clients, classes, and commission revenue",
    schema: z.object({ days: z.number().int().min(7).max(365).optional() }),
    agentScopes: ["read:analytics"],
    audit: "none",
    handler: async (ctx, input) => getTrainerLeaderboard(ctx.gymId, input.days ?? 90),
  });

  registerTool({
    name: "getMemberInsights",
    description: "360-style member snapshot: attendance, payments, opportunities",
    schema: z.object({ memberId: z.string().min(1) }),
    agentScopes: ["read:members"],
    audit: "none",
    handler: async (ctx, input) => {
      const insights = await getMemberInsights(ctx.gymId, input.memberId);
      if (!insights) {
        throw new ToolExecutionError("invalid_input", "member_not_found");
      }
      return insights;
    },
  });

  registerTool({
    name: "getPaymentTimingInsights",
    description: "Payment day-of-month and method patterns for discount timing",
    schema: z.object({ memberId: z.string().min(1).optional() }),
    agentScopes: ["read:payments"],
    audit: "none",
    handler: async (ctx, input) =>
      getPaymentTimingInsights(ctx.gymId, input.memberId),
  });

  registerTool({
    name: "listOffers",
    description: "List gym offers and promotions",
    schema: z.object({
      status: z.enum(["DRAFT", "ACTIVE", "EXPIRED"]).optional(),
    }),
    agentScopes: ["read:analytics"],
    audit: "none",
    handler: async (ctx, input) => {
      const offers = await listOffers(ctx.gymId, input.status);
      return { offers };
    },
  });

  registerTool({
    name: "createOffer",
    description: "Create a draft or active promotional offer",
    schema: z.object({
      name: z.string().min(1).max(120),
      description: z.string().max(500).optional(),
      discountPercent: z.number().min(0).max(100).optional(),
      discountInr: z.number().positive().optional(),
      status: z.enum(["DRAFT", "ACTIVE", "EXPIRED"]).optional(),
    }),
    agentScopes: ["write:reminders"],
    audit: "mutations",
    handler: async (ctx, input) => {
      const offer = await createOffer(ctx.gymId, input);
      return { offer };
    },
  });

  registerTool({
    name: "getRenewals",
    description: "Memberships expiring within the next 7 days",
    schema: z.object({ days: z.number().int().min(1).max(30).optional() }),
    agentScopes: ["read:analytics"],
    audit: "none",
    handler: async (ctx, input) => {
      const days = input.days ?? 7;
      const end = addDaysIST(todayIST(), days);
      const rows = await prisma.membership.findMany({
        where: {
          gymId: ctx.gymId,
          endDate: { lte: end, gte: todayIST() },
        },
        include: {
          Member: { select: { id: true, name: true, phone: true } },
          Plan: { select: { name: true } },
        },
        orderBy: { endDate: "asc" },
        take: 50,
      });
      return {
        count: rows.length,
        renewals: rows.map((m) => ({
          membershipId: m.id,
          memberId: m.memberId,
          memberName: m.Member.name,
          plan: m.Plan.name,
          endDate: m.endDate.toISOString().slice(0, 10),
          amount: Number(m.amount),
        })),
      };
    },
  });

  registerTool({
    name: "convertTrialToMember",
    description: "Admit a free-trial visitor as a paying member",
    schema: z.object({
      trialVisitId: z.string().min(1),
      planId: z.string().min(1),
      amount: z.number().positive(),
      admissionFee: z.number().optional(),
    }),
    agentScopes: ["write:reminders"],
    audit: "mutations",
    handler: async (ctx, input) => {
      if (!ctx.userId) {
        throw new ToolExecutionError("invalid_input", "userId required");
      }
      const result = await convertTrialToMember(ctx.gymId, ctx.userId, input);
      if ("error" in result && result.error) {
        throw new ToolExecutionError("invalid_input", result.error);
      }
      return result;
    },
  });

  registerTool({
    name: "createMembership",
    description: "Create an active membership for an existing member",
    schema: z.object({
      memberId: z.string().min(1),
      planId: z.string().min(1),
      amount: z.number().positive(),
      durationMonths: z.number().int().min(1).max(24).optional(),
    }),
    agentScopes: ["write:reminders"],
    audit: "mutations",
    handler: async (ctx, input) => {
      const membership = await createMembershipForMember(ctx.gymId, input);
      if (!membership) {
        throw new ToolExecutionError("invalid_input", "member_or_plan_not_found");
      }
      return { membershipId: membership.id };
    },
  });

  registerTool({
    name: "cancelMembership",
    description: "End a membership and mark member expired",
    schema: z.object({ membershipId: z.string().min(1) }),
    agentScopes: ["write:reminders"],
    audit: "mutations",
    handler: async (ctx, input) => {
      const result = await cancelMembershipForGym(ctx.gymId, input.membershipId);
      if (!result) {
        throw new ToolExecutionError("invalid_input", "membership_not_found");
      }
      return result;
    },
  });

  registerTool({
    name: "listLeads",
    description: "Open lead pipeline for the gym",
    schema: z.object({
      status: z
        .enum([
          "NEW",
          "CONTACTED",
          "TRIAL_SCHEDULED",
          "TRIAL_DONE",
          "CONVERTED",
          "LOST",
        ])
        .optional(),
    }),
    agentScopes: ["read:members"],
    audit: "none",
    handler: async (ctx, input) => {
      const leads = await listLeads(ctx.gymId, { status: input.status, limit: 50 });
      return { leads };
    },
  });

  registerTool({
    name: "createLead",
    description: "Capture a new enquiry in the lead pipeline",
    schema: z.object({
      name: z.string().min(1),
      phone: z.string().min(10),
      source: z.enum(["WEBSITE", "WHATSAPP", "WALK_IN", "REFERRAL", "INSTAGRAM", "PHONE_CALL", "OTHER"]).optional(),
      notes: z.string().optional(),
    }),
    agentScopes: ["write:reminders"],
    audit: "mutations",
    handler: async (ctx, input) => {
      const lead = await createLead(ctx.gymId, input);
      return { leadId: lead.id, status: lead.status };
    },
  });

  registerTool({
    name: "updateLead",
    description: "Update lead status or follow-up time",
    schema: z.object({
      leadId: z.string().min(1),
      status: z.enum(["NEW", "CONTACTED", "TRIAL_SCHEDULED", "TRIAL_DONE", "CONVERTED", "LOST"]).optional(),
      followUpAt: z.string().datetime().optional(),
      notes: z.string().optional(),
    }),
    agentScopes: ["write:reminders"],
    audit: "mutations",
    handler: async (ctx, input) => {
      const { leadId, ...rest } = input;
      const lead = await updateLead(ctx.gymId, leadId, {
        ...rest,
        followUpAt: rest.followUpAt ? new Date(rest.followUpAt) : undefined,
      });
      if (!lead) throw new ToolExecutionError("invalid_input", "lead_not_found");
      return { lead };
    },
  });

  registerTool({
    name: "convertLeadToTrial",
    description: "Book a free trial visit from a lead",
    schema: z.object({ leadId: z.string().min(1) }),
    agentScopes: ["write:reminders"],
    audit: "mutations",
    handler: async (ctx, input) => {
      if (!ctx.userId) throw new ToolExecutionError("invalid_input", "userId required");
      const result = await convertLeadToTrial(ctx.gymId, input.leadId, ctx.userId);
      if (!result) throw new ToolExecutionError("invalid_input", "lead_not_found");
      return result;
    },
  });

  registerTool({
    name: "listLeadsDueForFollowUp",
    description: "Leads with follow-up date on or before today",
    schema: z.object({}),
    agentScopes: ["read:members"],
    audit: "none",
    handler: async (ctx) => {
      const leads = await listLeadsDueForFollowUp(ctx.gymId);
      return { leads };
    },
  });

  registerTool({
    name: "recommendProducts",
    description: "List active merch/supplements for member upsell",
    schema: z.object({ category: z.enum(["MERCH", "SUPPLEMENT"]).optional() }),
    agentScopes: ["read:analytics"],
    audit: "none",
    handler: async (ctx, input) => {
      const products = await listProducts(ctx.gymId, true);
      const filtered = input.category
        ? products.filter((p) => p.category === input.category)
        : products;
      return { products: filtered.slice(0, 10) };
    },
  });

  registerTool({
    name: "getOperatingHoursFact",
    description: "Peak and quiet hours from nightly attendance analysis",
    schema: z.object({}),
    agentScopes: ["read:analytics"],
    audit: "none",
    handler: async (ctx) => {
      const fact = await getOperatingHoursFact(ctx.gymId);
      return { fact };
    },
  });

  registerTool({
    name: "draftEngagement",
    description: "Draft a WhatsApp engagement message (requires human confirm before send)",
    schema: z.object({
      memberId: z.string().min(1),
      purpose: z
        .enum(["renewal", "trial_followup", "pt_upsell", "discount", "general"])
        .optional(),
      tone: z.enum(["friendly", "urgent", "professional"]).optional(),
      offerName: z.string().optional(),
    }),
    agentScopes: ["write:reminders"],
    audit: "mutations",
    handler: async (ctx, input) => {
      const member = await prisma.member.findFirst({
        where: { id: input.memberId, gymId: ctx.gymId },
        include: {
          Membership: {
            where: { gymId: ctx.gymId },
            orderBy: { endDate: "desc" },
            take: 1,
            include: { Plan: { select: { name: true } } },
          },
        },
      });
      if (!member) {
        throw new ToolExecutionError("invalid_input", "member_not_found");
      }

      const insights = await getMemberInsights(ctx.gymId, member.id);
      const membership = member.Membership[0];
      const expiry = membership?.endDate ?? member.nextRenewalDate;
      const daysOverdue =
        expiry != null
          ? Math.max(0, -daysFromTodayIST(toDateOnlyIST(expiry)))
          : undefined;

      let draft = await formatSimpleReminderMessage({
        name: member.name,
        expiryDate: expiry ? formatDate(expiry) : "soon",
        daysLeft:
          expiry != null ? -daysFromTodayIST(toDateOnlyIST(expiry)) : undefined,
        daysOverdue: daysOverdue || undefined,
        planName: membership?.Plan?.name,
        phoneNumber: member.phone,
        gymId: ctx.gymId,
      });

      const purpose = input.purpose ?? "general";
      const tone = input.tone ?? "friendly";
      const firstName = member.name.split(" ")[0];

      if (purpose === "trial_followup") {
        draft = `Hi ${firstName}, thanks for visiting! We'd love to see you back — reply here to pick a plan that fits you.`;
      } else if (purpose === "pt_upsell") {
        const trainer = insights?.trainer ?? "our coach";
        draft = `Hi ${firstName}, ${trainer} has PT slots open this week. Want a quick intro session? Reply YES.`;
      } else if (purpose === "discount" && input.offerName) {
        draft = `Hi ${firstName}, limited offer: ${input.offerName}. Valid this week — renew at the front desk or reply here.`;
      } else if (purpose === "renewal" && tone === "urgent" && daysOverdue) {
        draft = `Hi ${firstName}, your membership is ${daysOverdue}d overdue. Please renew (${formatCurrency(Number(membership?.amount ?? 0))}) to avoid interruption.`;
      }

      return {
        draft,
        requiresHumanConfirm: true,
        memberId: member.id,
        phone: member.phone,
        purpose,
        tone,
        hints: insights?.engagementHints ?? [],
      };
    },
  });

  registerTool({
    name: "getTrainerPerformance",
    description: "Trainer revenue and avg revenue per client (E-021)",
    schema: z.object({ days: z.number().int().min(7).max(365).optional() }),
    agentScopes: ["read:analytics"],
    audit: "none",
    handler: async (ctx, input) =>
      getTrainerPerformance(ctx.gymId, input.days ?? 90),
  });

  registerTool({
    name: "applyPtDiscount",
    description: "Create an active PT discount offer for a trainer (E-022)",
    schema: z.object({
      trainerId: z.string().min(1),
      discountPercent: z.number().min(1).max(50),
      name: z.string().optional(),
    }),
    agentScopes: ["write:reminders"],
    audit: "mutations",
    handler: async (ctx, input) => {
      const offer = await applyPtDiscount(ctx.gymId, input);
      if (!offer) throw new ToolExecutionError("invalid_input", "trainer_not_found");
      return { offerId: offer.id, name: offer.name };
    },
  });

  registerTool({
    name: "createPtRevenueGoal",
    description: "Set a PT revenue goal (E-023)",
    schema: z.object({
      targetInr: z.number().positive(),
      deadline: z.string().datetime().optional(),
    }),
    agentScopes: ["write:reminders"],
    audit: "mutations",
    handler: async (ctx, input) => {
      const goal = await createPtRevenueGoal(ctx.gymId, {
        targetInr: input.targetInr,
        deadline: input.deadline ? new Date(input.deadline) : undefined,
        createdById: ctx.userId ?? undefined,
      });
      return { goalId: goal.id, metricType: goal.metricType };
    },
  });

  registerTool({
    name: "suggestPaymentOptions",
    description: "Personalised payment method and timing options (E-034)",
    schema: z.object({ memberId: z.string().min(1) }),
    agentScopes: ["read:payments"],
    audit: "none",
    handler: async (ctx, input) => {
      const options = await suggestPaymentOptions(ctx.gymId, input.memberId);
      if (!options) throw new ToolExecutionError("invalid_input", "member_not_found");
      return options;
    },
  });

  registerTool({
    name: "createOrderLine",
    description: "Add a merch/supplement order line for a member (E-050)",
    schema: z.object({
      memberId: z.string().optional(),
      productId: z.string().min(1),
      quantity: z.number().int().min(1).optional(),
    }),
    agentScopes: ["write:reminders"],
    audit: "mutations",
    handler: async (ctx, input) => {
      const line = await createOrderLine(ctx.gymId, input);
      if (!line) throw new ToolExecutionError("invalid_input", "product_not_found");
      return { orderLineId: line.id };
    },
  });

  registerTool({
    name: "supplementRepurchaseNudge",
    description: "List supplement repurchase candidates with draft hints (E-052)",
    schema: z.object({}),
    agentScopes: ["read:analytics"],
    audit: "none",
    handler: async (ctx) => listSupplementRepurchaseCandidates(ctx.gymId),
  });
}
