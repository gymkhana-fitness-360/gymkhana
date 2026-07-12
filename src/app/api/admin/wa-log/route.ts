import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { requireApiGymId } from "@/lib/api/gym-context";
import { listCommunicationEvents } from "@/domains/communications/communication-ledger";

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;
  const session = await auth();
  if (!session) return ApiErrors.unauthorized();
  const gymId = await requireApiGymId(session, request);
  if (gymId instanceof NextResponse) return gymId;

  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") ?? 100), 500);
  const events = await listCommunicationEvents(gymId, { limit });
  const logs = events
    .filter((e) => e.channel === "WHATSAPP")
    .map((e) => ({
      id: e.id,
      gymId: e.gymId,
      memberId: e.memberId,
      message: e.message,
      status: e.status,
      sentAt: e.createdAt,
      provider: e.provider,
      providerMessageId: e.providerMessageId,
      Member: e.Member,
    }));

  return NextResponse.json({ success: true, data: logs });
}
