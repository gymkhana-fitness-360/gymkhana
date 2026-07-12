import { prisma } from "@/lib/prisma";
import { MemberStatus } from "@prisma/client";
import { todayIST } from "@/lib/date-only";
import { createLogger } from "@/lib/logger";

const logger = createLogger("admin-repair-stale-overdue");

export type FixStaleOverdueInput = {
  gymId: string;
  dryRun?: boolean;
};

export async function fixStaleOverdue(input: FixStaleOverdueInput) {
  const dryRun = Boolean(input.dryRun);
  logger.info(`fix-stale-overdue ${dryRun ? "DRY-RUN" : "EXECUTE"} gym=${input.gymId}`);

  const today = todayIST();
  const openRecords = await prisma.overdueTracking.findMany({
    where: { gymId: input.gymId, markedInactiveAt: null, resolvedAt: null },
    select: {
      id: true,
      memberId: true,
      detectedAt: true,
      Member: { select: { id: true, name: true, status: true } },
    },
  });

  if (openRecords.length === 0) {
    return { dryRun, staleCleared: 0, statusFixed: 0, message: "Nothing to fix" };
  }

  const byMember = new Map<
    string,
    { name: string; status: string; recordIds: string[]; earliestDetectedAt: Date }
  >();
  for (const r of openRecords) {
    const existing = byMember.get(r.memberId);
    if (!existing) {
      byMember.set(r.memberId, {
        name: r.Member.name,
        status: r.Member.status,
        recordIds: [r.id],
        earliestDetectedAt: r.detectedAt,
      });
    } else {
      existing.recordIds.push(r.id);
      if (r.detectedAt < existing.earliestDetectedAt) {
        existing.earliestDetectedAt = r.detectedAt;
      }
    }
  }

  let staleCleared = 0;
  let statusFixed = 0;
  const cleared: {
    memberId: string;
    name: string;
    recordsDeleted: number;
    statusUpdated: boolean;
  }[] = [];

  for (const [memberId, info] of byMember) {
    const paymentAfterOverdue = await prisma.payment.findFirst({
      where: {
        gymId: input.gymId,
        memberId,
        status: "COMPLETED",
        OR: [
          { receivedAt: { gte: info.earliestDetectedAt } },
          { paymentDate: { gte: info.earliestDetectedAt } },
        ],
      },
      select: { id: true },
    });
    if (!paymentAfterOverdue) continue;

    const validMembership = await prisma.membership.findFirst({
      where: { gymId: input.gymId, memberId, endDate: { gt: today } },
      select: { id: true },
    });

    if (!dryRun) {
      await prisma.overdueTracking.deleteMany({ where: { id: { in: info.recordIds } } });
      if (validMembership && info.status === MemberStatus.EXPIRED) {
        await prisma.member.update({
          where: { id: memberId },
          data: { status: MemberStatus.ACTIVE },
        });
        statusFixed++;
      }
    }

    staleCleared += info.recordIds.length;
    cleared.push({
      memberId,
      name: info.name,
      recordsDeleted: info.recordIds.length,
      statusUpdated: !!(validMembership && info.status === MemberStatus.EXPIRED),
    });
  }

  return {
    dryRun,
    staleCleared,
    statusFixed,
    membersAffected: cleared.length,
    details: cleared,
    message: dryRun
      ? `Dry run: would clear ${staleCleared} stale records`
      : `Cleared ${staleCleared} stale overdue records`,
  };
}
