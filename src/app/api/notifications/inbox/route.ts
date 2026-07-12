import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { ApiErrors } from "@/lib/api-handler";

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();

  const gymId = await resolveGymIdForUser(
    session.user.id,
    readRequestedGymIdFromRequest(request)
  );
  if (!gymId) return ApiErrors.badRequest("No gym selected");

  const unreadOnly = request.nextUrl.searchParams.get("unread") === "true";

  const notifications = await prisma.staffNotification.findMany({
    where: {
      gymId,
      userId: session.user.id,
      ...(unreadOnly ? { readAt: null } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(notifications);
}

export async function PATCH(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();

  const { id } = await request.json().catch(() => ({}));
  if (!id) return ApiErrors.validationError("id required");

  await prisma.staffNotification.updateMany({
    where: { id, userId: session.user.id },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
