import { NextRequest, NextResponse } from "next/server";
import { getGymContext, GymContextError } from "@/domains/tenancy";
import type { IPlanCommands } from "../interfaces";
import type { PlanDTO } from "../types";
import { ApiErrors } from "@/lib/api-handler";
import { PlanNotFoundError } from "../adapters/prisma-plan-queries";

export async function deactivatePlanHandler(
  req: NextRequest,
  params: { id: string },
  planCommands: IPlanCommands
): Promise<NextResponse<PlanDTO | { error: string }>> {
  try {
    const { gymId } = await getGymContext(req);
    const plan = await planCommands.deactivatePlan(gymId, params.id);
    return NextResponse.json(plan);
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    if (e instanceof PlanNotFoundError) {
      return ApiErrors.notFound("Plan");
    }
    throw e;
  }
}
