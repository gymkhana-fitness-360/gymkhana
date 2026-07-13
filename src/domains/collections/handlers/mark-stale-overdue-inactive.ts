/**
 * Mark overdue tracking rows inactive when member has not attended for 7+ days (per gym).
 */
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import { addDaysIST, todayIST } from "@/lib/date-only";

const logger = createLogger("collections-overdue-inactive");

export async function markStaleOverdueInactiveForGym(gymId: string) {
  const sevenDaysAgo = addDaysIST(todayIST(), -7);

  const toMarkInactive = await prisma.overdueTracking.findMany({
    where: {
      gymId,
      lastSeenAt: { lte: sevenDaysAgo },
      markedInactiveAt: null,
      resolvedAt: null,
    },
    include: {
      Member: { select: { id: true, name: true } },
    },
  });

  const neverSeen = await prisma.overdueTracking.findMany({
    where: {
      gymId,
      detectedAt: { lte: sevenDaysAgo },
      lastSeenAt: null,
      markedInactiveAt: null,
      resolvedAt: null,
    },
    include: {
      Member: { select: { id: true, name: true } },
    },
  });

  const allToMarkInactive = [...toMarkInactive, ...neverSeen];
  const now = new Date();

  const updated = await Promise.all(
    allToMarkInactive.map((record) =>
      prisma.overdueTracking.update({
        where: { id: record.id },
        data: {
          markedInactiveAt: now,
          notes: "Auto-marked inactive - no attendance for 7+ days",
        },
      }),
    ),
  );

  if (updated.length > 0) {
    await prisma.auditLog.create({
      data: {
        gymId,
        userId: "system",
        action: "overdue_auto_cleanup",
        entityType: "OverdueTracking",
        entityId: null,
        details: {
          markedInactive: updated.length,
          members: allToMarkInactive.map((r) => ({
            id: r.Member.id,
            name: r.Member.name,
            month: r.month,
          })),
          timestamp: now.toISOString(),
        },
      },
    });
  }

  logger.info("markStaleOverdueInactiveForGym", { gymId, markedInactive: updated.length });

  return {
    markedInactive: updated.length,
    members: allToMarkInactive.map((r) => ({
      id: r.Member.id,
      name: r.Member.name,
      month: r.month,
    })),
  };
}

/** Platform cron: run stale overdue cleanup for every gym. */
export async function markStaleOverdueInactive() {
  const gyms = await prisma.gym.findMany({ select: { id: true } });
  let markedInactive = 0;
  const members: Array<{ id: string; name: string; month: string }> = [];

  for (const gym of gyms) {
    const result = await markStaleOverdueInactiveForGym(gym.id);
    markedInactive += result.markedInactive;
    members.push(...result.members);
  }

  return { markedInactive, members };
}
