import { z } from "zod";
import { registerTool } from "./registry";
import { listGymFacts } from "@/domains/intelligence/gym-facts";
import { prisma } from "@/lib/prisma";
export function registerOsTools() {
  registerTool({
    name: "listGymFacts",
    description: "Read nightly gym knowledge facts (metrics + insights)",
    schema: z.object({
      factType: z.enum(["METRIC", "INSIGHT", "AGGREGATE"]).optional(),
    }),
    agentScopes: ["read:analytics"],
    audit: "none",
    handler: async (ctx, input) => {
      const facts = await listGymFacts(ctx.gymId, input.factType);
      return { facts };
    },
  });

  registerTool({
    name: "createCampaign",
    description:
      "Create a WhatsApp campaign draft (preview + human confirm before send)",
    schema: z.object({
      name: z.string().min(1).max(120),
      templateId: z.string().optional(),
      recipients: z.array(
        z.object({
          memberId: z.string().optional(),
          phone: z.string().min(10),
          message: z.string().min(1).max(4000),
        }),
      ).min(1).max(500),
    }),
    agentScopes: ["write:reminders"],
    audit: "mutations",
    handler: async (ctx, input) => {
      const campaign = await prisma.whatsAppCampaign.create({
        data: {
          gymId: ctx.gymId,
          name: input.name,
          templateId: input.templateId ?? null,
          recipientCount: input.recipients.length,
          status: "DRAFT",
          payload: {
            recipients: input.recipients,
            requiresConfirm: true,
          },
        },
      });
      return {
        campaignId: campaign.id,
        status: "DRAFT",
        recipientCount: input.recipients.length,
        nextStep:
          "POST /api/whatsapp/campaigns with previewOnly then confirmed:true",
      };
    },
  });
}
