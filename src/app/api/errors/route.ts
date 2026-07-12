import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { ApiErrors } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { requireApiGymId } from "@/lib/api/gym-context";
import { listErrorLogs } from "@/lib/services/error-log.service";

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();
  if (session.user.role !== "ADMIN") return ApiErrors.forbidden("Admin access required");

  const gymId = await requireApiGymId(session, request);
  if (gymId instanceof Response) return gymId;

  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") ?? 100), 200);
  const rows = await listErrorLogs(gymId, limit);
  return successResponse({ errors: rows });
}
