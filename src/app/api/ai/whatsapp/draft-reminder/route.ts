import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getGymContext, GymContextError } from "@/domains/tenancy";
import { ApiErrors } from "@/lib/api-handler";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { formatSimpleReminderMessage } from "@/lib/templates/reminder-simple";
import { formatDate } from "@/lib/utils";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { prisma } from "@/lib/prisma";
import { toDateOnlyIST, daysFromTodayIST } from "@/lib/date-only";

const bodySchema = z.object({
  memberId: z.string().min(1),
  tone: z.enum(["friendly", "urgent", "professional"]).optional(),
});

/**
 * GYM-AI-004: Draft WhatsApp reminder for human review before send.
 */
export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "moderate");
  if (rl) return rl;

  try {
    const { gymId } = await getGymContext(request);
    const parsed = await parseJsonBody(request, bodySchema);
    if (!parsed.ok) return parsed.response;

    const member = await prisma.member.findFirst({
      where: { id: parsed.data.memberId, gymId },
      include: {
        Membership: { where: { gymId }, orderBy: { endDate: "desc" }, take: 1 },
      },
    });
    if (!member) return ApiErrors.notFound("Member");

    const membership = member.Membership[0];
    const expiry = membership?.endDate ?? member.nextRenewalDate;
    const daysOverdue =
      expiry != null
        ? Math.max(0, -daysFromTodayIST(toDateOnlyIST(expiry)))
        : undefined;

    const draft = formatSimpleReminderMessage({
      name: member.name,
      expiryDate: expiry ? formatDate(expiry) : "soon",
      daysOverdue: daysOverdue || undefined,
      phoneNumber: member.phone,
    });

    return NextResponse.json({
      draft,
      requiresHumanConfirm: true,
      memberId: member.id,
      phone: member.phone,
      suggestedTemplate: "reminder",
    });
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
