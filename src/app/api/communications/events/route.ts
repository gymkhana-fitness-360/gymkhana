import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";
import { listCommunicationEvents } from "@/domains/communications/communication-ledger";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api-communications");

export async function GET(request: NextRequest) {
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

    const memberId = request.nextUrl.searchParams.get("memberId") ?? undefined;
    const limit = parseInt(request.nextUrl.searchParams.get("limit") ?? "100", 10);

    const events = await listCommunicationEvents(gymId, {
      memberId,
      limit: Number.isNaN(limit) ? 100 : limit,
    });

    return NextResponse.json({ events });
  } catch (error) {
    logger.error("Failed to list communication events", error as Error);
    return ApiErrors.internal("Failed to list communication events");
  }
}
