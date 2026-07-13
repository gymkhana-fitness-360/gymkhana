import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";
import { ApiErrors } from "@/lib/api-handler";

const markReadSchema = z.object({ id: z.string().min(1) });

export async function listNotificationsInboxHandler(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();

  const gymId = await resolveGymIdForUser(
    session.user.id,
    readRequestedGymIdFromRequest(request),
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

export async function markNotificationReadHandler(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();

  const parsed = markReadSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return ApiErrors.validationError("id required");
  const { id } = parsed.data;

  await prisma.staffNotification.updateMany({
    where: { id, userId: session.user.id },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
