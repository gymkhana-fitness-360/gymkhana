import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { todayIST } from "@/lib/date-only";
import { updateMemberScoped } from "@/domains/tenancy/scoped-write";
import { createLogger } from "@/lib/logger";

const logger = createLogger("memberships-sync-from-payments");

/** Reconcile member renewal dates from latest linked membership per payment. */
export async function syncMembershipsFromPayments(gymId: string) {
  const members = await prisma.member.findMany({
    where: { gymId },
    select: { id: true },
    take: 2000,
  });

  let updated = 0;
  const today = todayIST();

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
      await updateMemberScoped(prisma, gymId, memberId, {
        nextRenewalDate: payMembership.endDate,
        status: payMembership.endDate >= today ? "ACTIVE" : "EXPIRED",
      });
      updated++;
    }
  }

  logger.info("syncMembershipsFromPayments", { gymId, updated });

  return NextResponse.json({ success: true, data: { membersUpdated: updated } });
}
