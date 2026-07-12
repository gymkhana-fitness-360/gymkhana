import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { requireApiGymId } from "@/lib/api/gym-context";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { probeCampaignAudience, createCampaignDraft } from "@/domains/campaigns/service";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  message: z.string().min(1).max(4000),
  segment: z.enum(["expiring_this_week", "overdue", "lapsed_30d", "all_active"]),
  templateId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "moderate");
  if (rl) return rl;
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();
  const gymId = await requireApiGymId(session, request);
  if (gymId instanceof NextResponse) return gymId;

  const parsed = await parseJsonBody(request, createSchema);
  if (!parsed.ok) return parsed.response;
  const analytics = await probeCampaignAudience(gymId, parsed.data.segment);
  const campaign = await createCampaignDraft({
    gymId,
    name: parsed.data.name,
    message: parsed.data.message,
    segment: parsed.data.segment,
    templateId: parsed.data.templateId,
    analytics,
  });
  return NextResponse.json({ success: true, data: campaign });
}

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;
  const session = await auth();
  if (!session) return ApiErrors.unauthorized();
  const gymId = await requireApiGymId(session, request);
  if (gymId instanceof NextResponse) return gymId;

  const campaigns = await prisma.whatsAppCampaign.findMany({
    where: { gymId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ success: true, data: campaigns });
}
