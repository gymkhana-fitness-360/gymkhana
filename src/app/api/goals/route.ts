import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { getGymContext, GymContextError } from "@/domains/tenancy";
import {
  createRecoveryGoal,
  getActiveGoal,
  refreshGoalRecovery,
} from "@/domains/goals/service";
import { parseJsonBody } from "@/lib/security/parse-json-body";

const createSchema = z.object({
  targetInr: z.number().positive(),
  title: z.string().min(1).max(200).optional(),
  deadline: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date").optional(),
});

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  try {
    const { gymId } = await getGymContext(request);
    const active = await getActiveGoal(gymId);
    const goal = active
      ? (await refreshGoalRecovery(gymId, active.id)) ?? active
      : null;
    return NextResponse.json({ goal });
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    return ApiErrors.internal("Failed to load goal");
  }
}

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "moderate");
  if (rl) return rl;

  try {
    const { gymId, userId } = await getGymContext(request);
    const session = await auth();
    if (!session?.user?.id) return ApiErrors.unauthorized();

    const parsed = await parseJsonBody(request, createSchema);
    if (!parsed.ok) return parsed.response;

    const goal = await createRecoveryGoal(gymId, {
      targetInr: parsed.data.targetInr,
      title: parsed.data.title,
      deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : undefined,
      createdById: userId,
    });

    return NextResponse.json({ goal }, { status: 201 });
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    return ApiErrors.internal("Failed to create goal");
  }
}
