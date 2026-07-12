import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { ApiErrors } from "@/lib/api-handler";
import { parseJsonBody } from "@/lib/security/parse-json-body";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

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

  const services = await prisma.service.findMany({
    where: { gymId },
    include: { Plan: { where: { isActive: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(services);
}

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();
  if (session.user.role !== "ADMIN") return ApiErrors.forbidden("Admin required");

  const gymId = await resolveGymIdForUser(
    session.user.id,
    readRequestedGymIdFromRequest(request)
  );
  if (!gymId) return ApiErrors.badRequest("No gym selected");

  const parsed = await parseJsonBody(request, createSchema);
  if (!parsed.ok) return parsed.response;

  const service = await prisma.service.create({
    data: {
      gymId,
      name: parsed.data.name,
      description: parsed.data.description,
    },
  });

  return NextResponse.json(service, { status: 201 });
}
