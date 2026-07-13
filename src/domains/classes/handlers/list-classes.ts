import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiErrors, successResponse } from "@/lib/api-response";
import { requirePermission, PermissionError } from "@/lib/permissions";
import { isMarketplaceAppEnabled } from "@/lib/marketplace/install";
import { z } from "zod";
import { getApiGymId } from "@/lib/api/gym-context";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  trainerName: z.string().max(80).optional(),
  description: z.string().max(500).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  capacity: z.number().int().min(1).max(500).optional(),
});

export async function listClassesHandler(request: NextRequest) {
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

  const from = request.nextUrl.searchParams.get("from");
  const classes = await prisma.gymClass.findMany({
    where: {
      gymId,
      ...(from ? { startsAt: { gte: new Date(from) } } : {}),
    },
    include: {
      _count: { select: { ClassBooking: true } },
    },
    orderBy: { startsAt: "asc" },
    take: 100,
  });

  return successResponse({
    classes: classes.map((c) => ({
      id: c.id,
      name: c.name,
      trainerName: c.trainerName,
      description: c.description,
      startsAt: c.startsAt.toISOString(),
      endsAt: c.endsAt.toISOString(),
      capacity: c.capacity,
      status: c.status,
      bookingsCount: c._count.ClassBooking,
    })),
  });
}

export async function createClassHandler(request: NextRequest) {
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

  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return ApiErrors.validationError("Invalid body", parsed.error.issues);
  }

  const { name, trainerName, description, startsAt, endsAt, capacity } = parsed.data;
  const created = await prisma.gymClass.create({
    data: {
      gymId,
      name,
      trainerName,
      description,
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
      capacity: capacity ?? 20,
    },
  });

  return successResponse({ class: created }, 201);
}
