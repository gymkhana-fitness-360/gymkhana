import { NextRequest, NextResponse } from "next/server";
import { getGymContext, GymContextError } from "@/domains/tenancy";
import type { IPlanQueries } from "../interfaces";
import type { PlanDTO } from "../types";

export async function listPlansHandler(
  req: NextRequest,
  planQueries: IPlanQueries
): Promise<NextResponse<PlanDTO[] | { error: string }>> {
  try {
    const { gymId } = await getGymContext(req);
    const includeInactive =
      req.nextUrl.searchParams.get("all") === "true";
    const plans = await planQueries.listPlans(gymId, { includeInactive });
    return NextResponse.json(plans);
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
