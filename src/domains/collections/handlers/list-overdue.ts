import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { detectOverdueMembers } from "@/domains/collections/services/overdue.service";
import { todayIST, addDaysIST, calendarDaysApartIST, compareDateIST } from "@/lib/date-only";
import { requireApiGymId } from "@/lib/api/gym-context";
import type { Session } from "next-auth";

export async function listOverdueForGymId(gymId: string) {
  const overdueMembers = await detectOverdueMembers(gymId);
  const today = todayIST();
  const thirtyDaysAgo = addDaysIST(today, -30);

  const enrichedRecords = overdueMembers.map((member) => {
    const renewalDate = member.nextRenewalDate!;
    const daysOverdue =
      compareDateIST(renewalDate, today) < 0
        ? calendarDaysApartIST(today, renewalDate)
        : 0;
    const lastPayment = member.Payment[0];
    const daysSinceLastPayment = lastPayment
      ? calendarDaysApartIST(today, lastPayment.receivedAt)
      : null;

    return {
      id: member.id,
      name: member.name,
      phone: member.phone,
      status: member.status,
      nextRenewalDate: renewalDate,
      daysOverdue,
      daysSinceLastPayment,
      lastPaymentAmount: lastPayment ? Number(lastPayment.amount) : null,
      lastPaymentDate: lastPayment?.receivedAt || null,
      shouldFollowUp: daysOverdue >= 7,
    };
  });

  enrichedRecords.sort((a, b) => b.daysOverdue - a.daysOverdue);

  return NextResponse.json({
    success: true,
    count: enrichedRecords.length,
    windowStart: thirtyDaysAgo.toISOString().split("T")[0],
    windowEnd: today.toISOString().split("T")[0],
    overdueMembers: enrichedRecords,
  });
}

export async function listOverdueMembersResponse(
  session: Session,
  request: NextRequest,
) {
  const gymId = await requireApiGymId(session, request);
  if (gymId instanceof NextResponse) {
    return gymId;
  }
  return listOverdueForGymId(gymId);
}
