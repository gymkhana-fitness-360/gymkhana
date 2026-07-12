import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { prisma } from "@/lib/prisma";
import {
  assignDietPlan,
  getDietPlanAssignment,
} from "@/domains/members/diet-plan";

const assignSchema = z.object({
  title: z.string().min(1).max(200),
  linkUrl: z.string().url().optional(),
  notes: z.string().max(500).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    const member = await prisma.member.findFirst({
      where: { id, gymId },
      select: { id: true },
    });
    if (!member) return ApiErrors.notFound("Member");

    const assignment = await getDietPlanAssignment(gymId, id);
    return NextResponse.json({ assignment });
  } catch {
    return ApiErrors.internal("Failed to load diet plan");
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = withRateLimit(request, "moderate");
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

    const { id } = await params;
    const member = await prisma.member.findFirst({
      where: { id, gymId },
      select: { id: true },
    });
    if (!member) return ApiErrors.notFound("Member");

    const parsed = await parseJsonBody(request, assignSchema);
    if (!parsed.ok) return parsed.response;

    const assignment = await assignDietPlan(gymId, id, parsed.data);
    return NextResponse.json({ assignment }, { status: 201 });
  } catch {
    return ApiErrors.internal("Failed to assign diet plan");
  }
}
