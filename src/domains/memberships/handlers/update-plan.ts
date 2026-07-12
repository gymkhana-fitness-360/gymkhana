import { NextRequest, NextResponse } from "next/server";
import { getGymContext, GymContextError } from "@/domains/tenancy";
import type { IPlanCommands } from "../interfaces";
import type { PlanDTO } from "../types";
import { ApiErrors } from "@/lib/api-handler";
import { PlanNotFoundError } from "../adapters/prisma-plan-queries";

export async function updatePlanHandler(
  req: NextRequest,
  params: { id: string },
  planCommands: IPlanCommands
): Promise<NextResponse<PlanDTO | { error: string }>> {
  try {
    const { gymId } = await getGymContext(req);
    const body = await req.json().catch(() => ({}));
    const data: {
      name?: string;
      durationDays?: number;
      price?: number;
      description?: string | null;
      isActive?: boolean;
    } = {};

    if (typeof body.name === "string" && body.name.trim()) {
      data.name = body.name.trim();
    }
    if (typeof body.durationDays === "number" && body.durationDays > 0) {
      data.durationDays = body.durationDays;
    }
    if (typeof body.price === "number" && body.price >= 0) {
      data.price = body.price;
    }
    if (body.description !== undefined) {
      data.description =
        body.description === "" || body.description == null
          ? null
          : String(body.description);
    }
    if (typeof body.isActive === "boolean") {
      data.isActive = body.isActive;
    }

    const plan = await planCommands.updatePlan(gymId, params.id, data);
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
