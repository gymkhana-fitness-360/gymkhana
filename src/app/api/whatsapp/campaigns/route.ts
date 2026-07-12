import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiErrors, successResponse } from "@/lib/api-response";
import { getApiGymId } from "@/lib/api/gym-context";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { recordCommunicationEvent } from "@/domains/communications/communication-ledger";
import { getWhatsAppDirectMessaging } from "@/domains/communications/adapters";

const bodySchema = z.object({
  name: z.string().min(1).max(120),
  templateId: z.string().optional(),
  recipients: z.array(
    z.object({
      memberId: z.string().optional(),
      phone: z.string().min(10),
      message: z.string().min(1).max(4000),
    }),
  ),
  previewOnly: z.boolean().optional(),
  confirmed: z.boolean().optional(),
});

/** GTM-W-003: bulk campaign with preview + ledger entries. */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();

  const gymId = await getApiGymId(session, request);
  if (!gymId) return ApiErrors.badRequest("No gym selected");

  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return parsed.response;

  const { recipients, previewOnly, confirmed, name, templateId } = parsed.data;

  if (previewOnly) {
    return successResponse({
      preview: true,
      total: recipients.length,
      samples: recipients.slice(0, 3),
    });
  }

  if (!confirmed) {
    return ApiErrors.validationError("Set confirmed: true after preview");
  }

  const campaign = await prisma.whatsAppCampaign.create({
    data: {
      gymId,
      name,
      templateId: templateId ?? null,
      recipientCount: recipients.length,
      status: "DRAFT",
      payload: { recipientCount: recipients.length },
    },
  });

  const messaging = getWhatsAppDirectMessaging();
  let sent = 0;
  let failed = 0;

  for (const r of recipients) {
    const result = await messaging.sendDirect({
      phoneNumber: r.phone,
      message: r.message,
    });
    if (result.success) {
      sent += 1;
      await recordCommunicationEvent({
        gymId,
        memberId: r.memberId ?? undefined,
        channel: "WHATSAPP",
        direction: "OUTBOUND",
        message: r.message,
        status: "SENT",
        provider: "whatsapp",
        legacySource: "whatsapp_campaign",
        legacyId: `${campaign.id}:${r.phone}`,
      });
    } else {
      failed += 1;
      await recordCommunicationEvent({
        gymId,
        memberId: r.memberId ?? undefined,
        channel: "WHATSAPP",
        direction: "OUTBOUND",
        message: r.message,
        status: "FAILED",
        provider: "whatsapp",
        legacySource: "whatsapp_campaign",
        legacyId: `${campaign.id}:${r.phone}`,
      });
    }
  }

  await prisma.whatsAppCampaign.update({
    where: { id: campaign.id },
    data: {
      status: failed === recipients.length ? "FAILED" : "SENT",
      sentAt: new Date(),
      recipientCount: sent,
    },
  });

  return successResponse({ campaignId: campaign.id, sent, failed });
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return ApiErrors.unauthorized();
  const gymId = await getApiGymId(session, request);
  if (!gymId) return ApiErrors.badRequest("No gym selected");

  const campaigns = await prisma.whatsAppCampaign.findMany({
    where: { gymId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return successResponse({ campaigns });
}
