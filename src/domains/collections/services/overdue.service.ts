/**
 * AUDIT-003: Resolve overdue tracking when payment is received (gym-scoped).
 */
import { prisma } from "@/lib/prisma";
import { MemberStatus } from "@prisma/client";
import { createLogger } from "@/lib/logger";
import { todayIST, addDaysIST } from "@/lib/date-only";
import { memberBelongsToGym } from "@/lib/gym-scope";

const logger = createLogger("collections-overdue");

/**
 * Detect members who are overdue based on rolling 30-day window
 */
export async function detectOverdueMembers(gymId: string) {
  const today = todayIST();
  const thirtyDaysAgo = addDaysIST(today, -30);

  const overdueMembers = await prisma.member.findMany({
    where: {
      gymId,
      nextRenewalDate: {
        gte: thirtyDaysAgo,
        lte: today,
      },
      status: {
        in: [MemberStatus.ACTIVE, MemberStatus.EXPIRED],
      },
    },
    include: {
      Payment: {
        where: {
          receivedAt: {
            gte: thirtyDaysAgo,
          },
        },
        orderBy: {
          receivedAt: "desc",
        },
        take: 1,
      },
    },
  });

  const actuallyOverdue = overdueMembers.filter((member) => {
    if (!member.nextRenewalDate) return false;

    if (member.Payment.length > 0) {
      const lastPayment = member.Payment[0];
      if (lastPayment.receivedAt >= member.nextRenewalDate) {
        return false;
      }
    }

    return true;
  });

  return actuallyOverdue;
}

/**
 * Auto-resolve overdue tracking when a payment is made (scoped to gym).
 */
export async function resolveOverdueOnPayment(memberId: string, gymId: string) {
  try {
    const belongs = await memberBelongsToGym(memberId, gymId);
    if (!belongs) {
      return { resolved: false, message: "Member not in gym" };
    }

    const overdueRecords = await prisma.overdueTracking.findMany({
      where: {
        gymId,
        memberId,
        markedInactiveAt: null,
      },
    });

    if (overdueRecords.length === 0) {
      return { resolved: false, message: "No overdue records found" };
    }

    await prisma.overdueTracking.deleteMany({
      where: {
        gymId,
        memberId,
      },
    });

    const member = await prisma.member.findFirst({
      where: { id: memberId, gymId },
      select: { status: true },
    });

    if (member?.status === MemberStatus.EXPIRED) {
      await prisma.member.updateMany({
        where: { id: memberId, gymId },
        data: { status: MemberStatus.ACTIVE },
      });
    }

    return {
      resolved: true,
      message: `Removed ${overdueRecords.length} overdue record(s)`,
      recordsRemoved: overdueRecords.length,
    };
  } catch (error) {
    logger.error("[resolveOverdueOnPayment]", error as Error);
    return {
      resolved: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
