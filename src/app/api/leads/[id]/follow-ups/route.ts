import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { FollowUpMethod } from "@prisma/client";
import { getGymContext, GymContextError } from "@/domains/tenancy";
import { prisma } from "@/lib/prisma";
import { ApiErrors } from "@/lib/api-handler";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { auth } from "@/lib/auth";

const createSchema = z.object({
  method: z.nativeEnum(FollowUpMethod).optional(),
  scheduleDate: z.string(),
  outcome: z.string().optional(),
  userId: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { gymId } = await getGymContext(req);
    const { id: leadId } = await params;

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, gymId, deletedAt: null },
    });
    if (!lead) return ApiErrors.notFound("Lead");

    const followUps = await prisma.leadFollowUp.findMany({
      where: { leadId, gymId },
      orderBy: { scheduleDate: "desc" },
      include: { User: { select: { id: true, name: true } } },
    });

    return NextResponse.json(followUps);
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { gymId } = await getGymContext(req);
    const session = await auth();
    if (!session?.user?.id) return ApiErrors.unauthorized();

    const { id: leadId } = await params;
    const parsed = await parseJsonBody(req, createSchema);
    if (!parsed.ok) return parsed.response;

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, gymId, deletedAt: null },
    });
    if (!lead) return ApiErrors.notFound("Lead");

    const followUp = await prisma.$transaction(async (tx) => {
      const row = await tx.leadFollowUp.create({
        data: {
          gymId,
          leadId,
          userId: parsed.data.userId ?? session.user.id,
          method: parsed.data.method ?? FollowUpMethod.CALL,
          scheduleDate: new Date(parsed.data.scheduleDate),
          outcome: parsed.data.outcome,
        },
        include: { User: { select: { id: true, name: true } } },
      });

      await tx.lead.update({
        where: { id: leadId },
        data: { followUpAt: new Date(parsed.data.scheduleDate) },
      });

      return row;
    });

    return NextResponse.json(followUp, { status: 201 });
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
