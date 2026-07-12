import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { getGymContext, GymContextError } from "@/domains/tenancy";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { updateLead } from "@/domains/leads/service";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  status: z
    .enum([
      "NEW",
      "CONTACTED",
      "TRIAL_SCHEDULED",
      "TRIAL_DONE",
      "CONVERTED",
      "LOST",
    ])
    .optional(),
  notes: z.string().max(2000).optional(),
  followUpAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date").nullable().optional(),
  lostReason: z.string().max(200).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = withRateLimit(request, "moderate");
  if (rl) return rl;

  try {
    const { gymId } = await getGymContext(request);
    const session = await auth();
    if (!session?.user?.id) return ApiErrors.unauthorized();

    const { id } = await params;
    const parsed = await parseJsonBody(request, patchSchema);
    if (!parsed.ok) return parsed.response;

    const lead = await updateLead(gymId, id, {
      status: parsed.data.status,
      notes: parsed.data.notes,
      followUpAt:
        parsed.data.followUpAt === null
          ? null
          : parsed.data.followUpAt
            ? new Date(parsed.data.followUpAt)
            : undefined,
      lostReason: parsed.data.lostReason,
    });

    if (!lead) return ApiErrors.notFound("Lead");
    return NextResponse.json({ lead });
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    return ApiErrors.internal("Failed to update lead");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = withRateLimit(request, "moderate");
  if (rl) return rl;

  try {
    const { gymId } = await getGymContext(request);
    const session = await auth();
    if (!session?.user?.id) return ApiErrors.unauthorized();
    if (session.user.role !== "ADMIN") return ApiErrors.forbidden("Admin required");

    const { id } = await params;
    const lead = await prisma.lead.findFirst({ where: { id, gymId, deletedAt: null } });
    if (!lead) return ApiErrors.notFound("Lead");

    await prisma.lead.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    return ApiErrors.internal("Failed to delete lead");
  }
}
