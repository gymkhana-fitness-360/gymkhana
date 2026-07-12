import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { requireApiGymId } from "@/lib/api/gym-context";
import { queueCampaignSend } from "@/domains/campaigns/service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = withRateLimit(request, "moderate");
  if (rl) return rl;
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();
  const gymId = await requireApiGymId(session, request);
  if (gymId instanceof NextResponse) return gymId;

  const { id } = await params;
  try {
    const campaign = await queueCampaignSend(gymId, id);
    return NextResponse.json({ success: true, data: campaign });
  } catch (e) {
    return ApiErrors.badRequest(e instanceof Error ? e.message : "Send failed");
  }
}
