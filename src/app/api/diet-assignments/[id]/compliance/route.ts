import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiErrors, successResponse } from "@/lib/api-response";
import { getApiGymId } from "@/lib/api/gym-context";
import { resourceBelongsToGym } from "@/domains/tenancy";

/** E-061: mark diet plan compliance check-in for a member. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return ApiErrors.unauthorized();

  const gymId = await getApiGymId(session, request);
  if (!gymId) return ApiErrors.badRequest("No gym selected");

  const { id } = await params;
  const assignment = await prisma.dietPlanAssignment.findUnique({
    where: { id },
    select: { id: true, gymId: true },
  });
  if (!resourceBelongsToGym(assignment, gymId)) {
    return ApiErrors.notFound("Diet assignment");
  }

  const updated = await prisma.dietPlanAssignment.update({
    where: { id },
    data: { complianceCheckedAt: new Date() },
  });

  return successResponse({ assignment: updated });
}
