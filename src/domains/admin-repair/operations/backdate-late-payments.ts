import { prisma } from "@/lib/prisma";
import { PaymentStatus } from "@prisma/client";
import { toDateOnlyIST, addDaysIST, calendarDaysApartIST, todayIST } from "@/lib/date-only";
import { createLogger } from "@/lib/logger";

const logger = createLogger("admin-repair-backdate");

export type BackdateLatePaymentsInput = {
  gymId: string;
  dryRun?: boolean;
  fromDate?: string;
  toDate?: string;
};

export async function backdateLatePayments(input: BackdateLatePaymentsInput) {
  const dryRun = Boolean(input.dryRun);
  const today = todayIST();
  const fromDate = input.fromDate ? toDateOnlyIST(input.fromDate) : addDaysIST(today, -90);
  const toDate = input.toDate ? toDateOnlyIST(input.toDate) : today;

  logger.info(`backdate-late-payments ${dryRun ? "DRY-RUN" : "EXECUTE"} gym=${input.gymId}`);

  const payments = await prisma.payment.findMany({
    where: {
      gymId: input.gymId,
      status: PaymentStatus.COMPLETED,
      OR: [
        { paymentDate: { gte: fromDate, lte: toDate } },
        { receivedAt: { gte: fromDate, lte: toDate } },
      ],
    },
    select: { memberId: true, paymentDate: true, receivedAt: true },
  });

  const seen = new Set<string>();
  const pairs: { memberId: string; payDate: Date }[] = [];
  for (const p of payments) {
    const payDate = toDateOnlyIST(p.paymentDate ?? p.receivedAt);
    const key = `${p.memberId}|${payDate.toISOString().slice(0, 10)}`;
    if (!seen.has(key)) {
      seen.add(key);
      pairs.push({ memberId: p.memberId, payDate });
    }
  }

  const memberIds = [...new Set(pairs.map((p) => p.memberId))];
  const allMemberships = await prisma.membership.findMany({
    where: { gymId: input.gymId, memberId: { in: memberIds } },
    select: {
      id: true,
      memberId: true,
      startDate: true,
      endDate: true,
      Plan: { select: { planType: true } },
    },
    orderBy: { startDate: "asc" },
  });

  const members = await prisma.member.findMany({
    where: { gymId: input.gymId, id: { in: memberIds } },
    select: { id: true, name: true },
  });
  const nameById = new Map(members.map((m) => [m.id, m.name]));

  const byMember = new Map<string, typeof allMemberships>();
  for (const m of allMemberships) {
    const arr = byMember.get(m.memberId) ?? [];
    arr.push(m);
    byMember.set(m.memberId, arr);
  }

  const candidates: {
    memberId: string;
    memberName: string;
    membershipId: string;
    paymentDate: string;
    oldStart: string;
    newStart: string;
    oldEnd: string;
    newEnd: string;
    gapDays: number;
  }[] = [];

  for (const { memberId, payDate } of pairs) {
    const memberships = byMember.get(memberId) ?? [];
    const payDateStr = payDate.toISOString().slice(0, 10);
    const membership = memberships.find(
      (m) => toDateOnlyIST(m.startDate).toISOString().slice(0, 10) === payDateStr,
    );
    if (!membership) continue;

    const planType = membership.Plan?.planType ?? "GYM";
    const memStart = toDateOnlyIST(membership.startDate);
    const memEnd = toDateOnlyIST(membership.endDate);
    const durationDays = calendarDaysApartIST(memStart, memEnd) + 1;

    const prev = memberships
      .filter(
        (m) =>
          m.id !== membership.id &&
          (m.Plan?.planType ?? "GYM") === planType &&
          toDateOnlyIST(m.endDate) < memStart,
      )
      .sort((a, b) => toDateOnlyIST(b.endDate).getTime() - toDateOnlyIST(a.endDate).getTime())[0];

    if (!prev) continue;

    const prevEnd = toDateOnlyIST(prev.endDate);
    const expectedStart = addDaysIST(prevEnd, 1);
    const gapDays = calendarDaysApartIST(expectedStart, memStart);
    if (gapDays < 8 || gapDays > 15) continue;

    const newStart = expectedStart;
    const newEnd = addDaysIST(newStart, durationDays - 1);

    candidates.push({
      memberId,
      memberName: nameById.get(memberId) ?? memberId,
      membershipId: membership.id,
      paymentDate: payDateStr,
      oldStart: memStart.toISOString().slice(0, 10),
      newStart: newStart.toISOString().slice(0, 10),
      oldEnd: memEnd.toISOString().slice(0, 10),
      newEnd: newEnd.toISOString().slice(0, 10),
      gapDays,
    });
  }

  if (!dryRun) {
    for (const c of candidates) {
      await prisma.membership.update({
        where: { id: c.membershipId },
        data: { startDate: new Date(c.newStart), endDate: new Date(c.newEnd) },
      });
    }
  }

  return {
    dryRun,
    fixed: candidates.length,
    candidates,
    message: dryRun
      ? `Dry run: ${candidates.length} memberships would be backdated`
      : `Backdated ${candidates.length} memberships`,
  };
}
