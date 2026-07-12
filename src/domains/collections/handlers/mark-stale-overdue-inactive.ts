/**
 * Mark overdue tracking rows inactive when member has not attended for 7+ days.
 */
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const logger = createLogger("collections-overdue-inactive");

export async function markStaleOverdueInactive() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const toMarkInactive = await prisma.overdueTracking.findMany({
    where: {
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

  logger.info("markStaleOverdueInactive", { markedInactive: updated.length });

  return {
    markedInactive: updated.length,
    members: allToMarkInactive.map((r) => ({
      id: r.Member.id,
      name: r.Member.name,
      month: r.month,
    })),
  };
}
