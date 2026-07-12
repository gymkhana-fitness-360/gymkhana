import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { ApiErrors } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { requireApiGymId } from "@/lib/api/gym-context";
import { createLogger } from "@/lib/logger";
import { fixStaleOverdue } from "@/domains/admin-repair";

const logger = createLogger("admin-fix-stale-overdue");

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();
  if (session.user.role !== "ADMIN") return ApiErrors.forbidden("Admin access required");

  const gymId = await requireApiGymId(session, request);
  if (gymId instanceof Response) return gymId;

  const body = (await request.json().catch(() => ({}))) as { dryRun?: boolean };

  try {
    const result = await fixStaleOverdue({ gymId, dryRun: body.dryRun });
    return successResponse(result);
  } catch (error) {
    logger.error("fix-stale-overdue error", error as Error);
    return ApiErrors.internal("Failed to run stale overdue fix");
  }
}
