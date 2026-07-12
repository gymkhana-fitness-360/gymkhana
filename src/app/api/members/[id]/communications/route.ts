import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";
import { listCommunicationEvents } from "@/domains/communications/communication-ledger";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api-member-communications");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session?.user?.id) return ApiErrors.unauthorized();

    const gymId = await resolveGymIdForUser(
      session.user.id,
      readRequestedGymIdFromRequest(request),
    );
    if (!gymId) {
      return ApiErrors.badRequest("No gym selected or account has no locations.");
    }

    const { id } = await params;
    const member = await prisma.member.findFirst({
      where: { id, gymId },
      select: { id: true },
    });
    if (!member) return ApiErrors.notFound("Member");

    const events = await listCommunicationEvents(gymId, { memberId: id, limit: 50 });
    return NextResponse.json({
      events: events.map((e) => ({
        id: e.id,
        channel: e.channel,
        direction: e.direction,
        status: e.status,
        templateId: e.templateId,
        message: e.message,
        createdAt: e.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    logger.error("Member communications failed", error as Error);
    return ApiErrors.internal("Failed to load communications");
  }
}
