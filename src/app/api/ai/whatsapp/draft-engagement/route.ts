import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getGymContext, GymContextError } from "@/domains/tenancy";
import { ApiErrors } from "@/lib/api-handler";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { formatSimpleReminderMessage } from "@/lib/templates/reminder-simple";
import { formatDate, formatCurrency } from "@/lib/utils";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { prisma } from "@/lib/prisma";
import { getMemberInsights } from "@/domains/members/member-insights";
import { toDateOnlyIST, daysFromTodayIST } from "@/lib/date-only";

const bodySchema = z.object({
  memberId: z.string().min(1),
  purpose: z.enum(["renewal", "trial_followup", "pt_upsell", "discount", "general"]).optional(),
  tone: z.enum(["friendly", "urgent", "professional"]).optional(),
  offerName: z.string().optional(),
});

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
        Membership: {
          where: { gymId },
          orderBy: { endDate: "desc" },
          take: 1,
          include: { Plan: { select: { name: true } } },
        },
      },
    });
    if (!member) return ApiErrors.notFound("Member");

    const insights = await getMemberInsights(gymId, member.id);
    const membership = member.Membership[0];
    const expiry = membership?.endDate ?? member.nextRenewalDate;
    const daysOverdue =
      expiry != null
        ? Math.max(0, -daysFromTodayIST(toDateOnlyIST(expiry)))
        : undefined;

    let draft = await formatSimpleReminderMessage({
      name: member.name,
      expiryDate: expiry ? formatDate(expiry) : "soon",
      daysLeft:
        expiry != null ? -daysFromTodayIST(toDateOnlyIST(expiry)) : undefined,
      daysOverdue: daysOverdue || undefined,
      planName: membership?.Plan?.name,
      phoneNumber: member.phone,
      gymId,
    });

    const purpose = parsed.data.purpose ?? "general";
    const tone = parsed.data.tone ?? "friendly";
    const firstName = member.name.split(" ")[0];

    if (purpose === "trial_followup") {
      draft = `Hi ${firstName}, thanks for visiting! We'd love to see you back — reply here to pick a plan that fits you.`;
    } else if (purpose === "pt_upsell") {
      const trainer = insights?.trainer ?? "our coach";
      draft = `Hi ${firstName}, ${trainer} has PT slots open this week. Want a quick intro session? Reply YES.`;
    } else if (purpose === "discount" && parsed.data.offerName) {
      draft = `Hi ${firstName}, limited offer: ${parsed.data.offerName}. Valid this week — renew at the front desk or reply here.`;
    } else if (purpose === "renewal" && tone === "urgent" && daysOverdue) {
      draft = `Hi ${firstName}, your membership is ${daysOverdue}d overdue. Please renew (${formatCurrency(Number(membership?.amount ?? 0))}) to avoid interruption.`;
    }

    return NextResponse.json({
      draft,
      requiresHumanConfirm: true,
      memberId: member.id,
      phone: member.phone,
      purpose,
      tone,
      hints: insights?.engagementHints ?? [],
    });
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    return ApiErrors.internal("Failed to draft message");
  }
}
