import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { ApiErrors, successResponse } from "@/lib/api-response";
import { getApiGymId } from "@/lib/api/gym-context";
import { listLeadsDueForFollowUp } from "@/domains/leads/service";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return ApiErrors.unauthorized();

  const gymId = await getApiGymId(session, request);
  if (!gymId) return ApiErrors.badRequest("No gym selected");

  const leads = await listLeadsDueForFollowUp(gymId);
  return successResponse({ leads });
}
