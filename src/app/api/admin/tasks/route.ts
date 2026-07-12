import { NextRequest, NextResponse } from "next/server";
import { AdminTaskStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { requireApiGymId } from "@/lib/api/gym-context";
import {
  listAdminTasks,
  resolveAdminTask,
  syncAllAdminTasks,
} from "@/domains/admin-tasks/service";

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "moderate");
  if (rl) return rl;
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();
  const gymId = await requireApiGymId(session, request);
  if (gymId instanceof NextResponse) return gymId;

  const status = request.nextUrl.searchParams.get("status") as AdminTaskStatus | null;
  const tasks = await listAdminTasks(gymId, status ?? undefined);
  return NextResponse.json({ success: true, data: tasks });
}

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "moderate");
  if (rl) return rl;
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();
  const gymId = await requireApiGymId(session, request);
  if (gymId instanceof NextResponse) return gymId;

  const body = await request.json().catch(() => ({}));
  if (body.action === "sync") {
    const result = await syncAllAdminTasks(gymId);
    return NextResponse.json({ success: true, data: result });
  }
  if (body.action === "resolve" || body.action === "dismiss") {
    if (!body.taskId) return ApiErrors.badRequest("taskId required");
    const task = await resolveAdminTask(gymId, body.taskId, session.user.id, body.action);
    return NextResponse.json({ success: true, data: task });
  }
  return ApiErrors.badRequest("Unknown action");
}
