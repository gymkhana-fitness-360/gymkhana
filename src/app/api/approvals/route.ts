import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { getGymContext, GymContextError } from "@/domains/tenancy";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import {
  createSendReminderApproval,
  decideApproval,
  listPendingApprovals,
} from "@/domains/approvals/service";

const decideSchema = z.object({
  approvalId: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED"]),
});

const createSchema = z.object({
  memberId: z.string().min(1),
  membershipId: z.string().min(1).optional(),
  message: z.string().min(1),
  phoneNumber: z.string().min(10),
});

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  try {
    const { gymId } = await getGymContext(request);
    const pending = await listPendingApprovals(gymId);
    return NextResponse.json({ approvals: pending });
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    return ApiErrors.internal("Failed to list approvals");
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

    const approval = await createSendReminderApproval(gymId, userId, parsed.data);
    return NextResponse.json({ approval }, { status: 201 });
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    return ApiErrors.internal("Failed to create approval");
  }
}

export async function PATCH(request: NextRequest) {
  const rl = withRateLimit(request, "moderate");
  if (rl) return rl;

  try {
    const { gymId, userId } = await getGymContext(request);
    const session = await auth();
    if (!session?.user?.id) return ApiErrors.unauthorized();

    const parsed = await parseJsonBody(request, decideSchema);
    if (!parsed.ok) return parsed.response;

    const result = await decideApproval(
      gymId,
      parsed.data.approvalId,
      parsed.data.decision,
      userId,
    );
    if (!result) return ApiErrors.notFound("Approval");

    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    return ApiErrors.internal("Failed to decide approval");
  }
}
