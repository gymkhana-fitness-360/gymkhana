import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { listOverdueForGymId } from "@/domains/collections/handlers/list-overdue";
import { getChasePlan, listOpportunities } from "@/domains/revenue-opportunities";
import { registerTool, ToolExecutionError } from "./registry";
import { createSendReminderApproval } from "@/domains/approvals/service";

export function registerCoreTools() {
  registerTool({
    name: "searchMembers",
    description: "Search members by name or phone",
    schema: z.object({ query: z.string().min(1), limit: z.number().int().min(1).max(50).optional() }),
    agentScopes: ["read:members"],
    audit: "none",
    handler: async (ctx, input) => {
      const q = input.query.trim();
      const rows = await prisma.member.findMany({
        where: {
          gymId: ctx.gymId,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { phone: { contains: q.replace(/\D/g, "") } },
          ],
        },
        take: input.limit ?? 20,
        select: { id: true, name: true, phone: true, status: true },
      });
      return { members: rows };
    },
  });

  registerTool({
    name: "getOverdues",
    description: "List overdue members for the gym",
    schema: z.object({}),
    agentScopes: ["read:overdue"],
    audit: "none",
    handler: async (ctx) => listOverdueForGymId(ctx.gymId).then((res) => res.json()),
  });

  registerTool({
    name: "listChaseCandidates",
    description: "Ranked revenue opportunities with reasons",
    schema: z.object({ limit: z.number().int().min(1).max(100).optional() }),
    agentScopes: ["read:analytics"],
    audit: "none",
    handler: async (ctx, input) => {
      const opportunities = await listOpportunities(ctx.gymId, {
        status: "OPEN",
        limit: input.limit ?? 25,
      });
      return { opportunities };
    },
  });

  registerTool({
    name: "sendReminder",
    description: "Queue a WhatsApp reminder for human approval (does not send immediately)",
    schema: z.object({
      memberId: z.string().min(1),
      message: z.string().min(1),
      phoneNumber: z.string().min(10),
      membershipId: z.string().optional(),
    }),
    agentScopes: ["write:reminders"],
    audit: "mutations",
    handler: async (ctx, input) => {
      if (!ctx.userId) {
        throw new ToolExecutionError("invalid_input", "userId required for approvals");
      }
      const member = await prisma.member.findFirst({
        where: { id: input.memberId, gymId: ctx.gymId },
      });
      if (!member) {
        throw new ToolExecutionError("invalid_input", "member_not_found");
      }
      const approval = await createSendReminderApproval(ctx.gymId, ctx.userId, {
        memberId: input.memberId,
        message: input.message,
        phoneNumber: input.phoneNumber,
        membershipId: input.membershipId,
      });
      return { approvalId: approval.id, status: approval.status };
    },
  });

  registerTool({
    name: "getChasePlan",
    description: "Structured recovery plan from open opportunities",
    schema: z.object({ limit: z.number().int().min(1).max(50).optional() }),
    agentScopes: ["read:analytics"],
    audit: "none",
    handler: async (ctx, input) => getChasePlan(ctx.gymId, input.limit ?? 25),
  });
}
