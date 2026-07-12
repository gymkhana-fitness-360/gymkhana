import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { requireApiGymId } from "@/lib/api/gym-context";
import { todayIST } from "@/lib/date-only";

/** Reconcile membership end dates from latest completed payments per member. */
export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "moderate");
  if (rl) return rl;
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();
  const gymId = await requireApiGymId(session, request);
  if (gymId instanceof NextResponse) return gymId;

  const members = await prisma.member.findMany({
    where: { gymId },
    select: { id: true },
    take: 2000,
  });

  let updated = 0;
  for (const { id: memberId } of members) {
    const latestMembership = await prisma.membership.findFirst({
      where: { gymId, memberId },
      orderBy: { endDate: "desc" },
    });
    if (!latestMembership) continue;
    const latestPayment = await prisma.payment.findFirst({
      where: { gymId, memberId, status: "COMPLETED" },
      orderBy: { paymentDate: "desc" },
      include: { ExpectedPayment: { select: { membershipId: true } } },
    });
    const linkedMembershipId =
      latestPayment?.ExpectedPayment?.membershipId ??
      (
        await prisma.membership.findFirst({
          where: { gymId, memberId, sourcePaymentId: latestPayment?.id },
          select: { id: true },
        })
      )?.id;
    if (!linkedMembershipId) continue;
    const payMembership = await prisma.membership.findFirst({
      where: { id: linkedMembershipId, gymId },
    });
    if (payMembership && payMembership.endDate > latestMembership.endDate) {
      await prisma.member.update({
        where: { id: memberId },
        data: { nextRenewalDate: payMembership.endDate, status: payMembership.endDate >= todayIST() ? "ACTIVE" : "EXPIRED" },
      });
      updated++;
    }
  }

  return NextResponse.json({ success: true, data: { membersUpdated: updated } });
}
