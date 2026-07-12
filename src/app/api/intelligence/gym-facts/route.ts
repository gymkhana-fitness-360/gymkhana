import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { ApiErrors, successResponse } from "@/lib/api-response";
import { getApiGymId } from "@/lib/api/gym-context";
import { listGymFacts } from "@/domains/intelligence/gym-facts";
import type { GymFactType } from "@prisma/client";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return ApiErrors.unauthorized();

  const gymId = await getApiGymId(session, request);
  if (!gymId) return ApiErrors.badRequest("No gym selected");

  const type = request.nextUrl.searchParams.get("type") as GymFactType | null;
  const facts = await listGymFacts(gymId, type ?? undefined);
  return successResponse({ facts });
}
