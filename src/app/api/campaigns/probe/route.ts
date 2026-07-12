import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { requireApiGymId } from "@/lib/api/gym-context";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { probeCampaignAudience, type CampaignSegment } from "@/domains/campaigns/service";
import { z } from "zod";

const schema = z.object({
  segment: z.enum(["expiring_this_week", "overdue", "lapsed_30d", "all_active"]),
});

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "moderate");
  if (rl) return rl;
  const session = await auth();
  if (!session) return ApiErrors.unauthorized();
  const gymId = await requireApiGymId(session, request);
  if (gymId instanceof NextResponse) return gymId;

  const parsed = await parseJsonBody(request, schema);
  if (!parsed.ok) return parsed.response;
  const data = await probeCampaignAudience(gymId, parsed.data.segment as CampaignSegment);
  return NextResponse.json({ success: true, data });
}
