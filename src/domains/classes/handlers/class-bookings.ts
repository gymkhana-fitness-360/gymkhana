import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiErrors, successResponse } from "@/lib/api-response";
import { requirePermission, PermissionError } from "@/lib/permissions";
import { isMarketplaceAppEnabled } from "@/lib/marketplace/install";
import { z } from "zod";
import { getApiGymId } from "@/lib/api/gym-context";

const bodySchema = z.object({
  memberId: z.string().min(1),
});

export async function createClassBookingHandler(
  request: NextRequest,
  classId: string,
) {
  const session = await auth();
  if (!session?.user) return ApiErrors.unauthorized();

  try {
    requirePermission(session, "canEditMembers");
  } catch (error) {
    if (error instanceof PermissionError) return ApiErrors.forbidden();
    throw error;
  }

  const gymId = await getApiGymId(session, request);
  if (!gymId) return ApiErrors.badRequest("No gym selected");

  const enabled = await isMarketplaceAppEnabled(gymId, "class-booking");
  if (!enabled) {
    return ApiErrors.forbidden("Install Class Booking from the Marketplace first");
  }

  const gymClass = await prisma.gymClass.findFirst({
    where: { id: classId, gymId },
    include: { _count: { select: { ClassBooking: true } } },
  });
  if (!gymClass) return ApiErrors.notFound("Class not found");

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return ApiErrors.validationError("Invalid body", parsed.error.issues);
  }

  if (gymClass._count.ClassBooking >= gymClass.capacity) {
    return ApiErrors.conflict("Class is full");
  }

  const member = await prisma.member.findFirst({
    where: { id: parsed.data.memberId, gymId },
  });
  if (!member) return ApiErrors.notFound("Member not found");

  try {
    const booking = await prisma.classBooking.create({
      data: {
        gymId,
        classId,
        memberId: parsed.data.memberId,
      },
      include: { Member: { select: { id: true, name: true, phone: true } } },
    });
    return successResponse({ booking }, 201);
  } catch {
    return ApiErrors.conflict("Member already booked for this class");
  }
}

export async function listClassBookingsHandler(
  request: NextRequest,
  classId: string,
) {
  const session = await auth();
  if (!session?.user) return ApiErrors.unauthorized();

  try {
    requirePermission(session, "canViewMembers");
  } catch (error) {
    if (error instanceof PermissionError) return ApiErrors.forbidden();
    throw error;
  }

  const gymId = await getApiGymId(session, request);
  if (!gymId) return ApiErrors.badRequest("No gym selected");

  const bookings = await prisma.classBooking.findMany({
    where: { classId, gymId },
    include: { Member: { select: { id: true, name: true, phone: true } } },
    orderBy: { bookedAt: "desc" },
  });

  return successResponse({ bookings });
}
