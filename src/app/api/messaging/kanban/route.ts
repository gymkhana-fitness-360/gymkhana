import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { requireApiGymId } from "@/lib/api/gym-context";
import { getMessagingKanban, type KanbanColumn } from "@/domains/messaging/kanban";

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;
  const session = await auth();
  if (!session) return ApiErrors.unauthorized();
  const gymId = await requireApiGymId(session, request);
  if (gymId instanceof NextResponse) return gymId;

  const includeParam = request.nextUrl.searchParams.get("include") ?? "renewals,expiry,admissions";
  const columns = includeParam.split(",").filter(Boolean) as KanbanColumn[];
  const payload = await getMessagingKanban(gymId, columns);
  return NextResponse.json({ success: true, data: payload });
}
