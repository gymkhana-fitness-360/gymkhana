import { prisma } from "@/lib/prisma";
import { MemberStatus } from "@prisma/client";
import { createLogger } from "@/lib/logger";
import { todayIST, addDaysIST } from "@/lib/date-only";

const logger = createLogger("collections-overdue");

/**
 * OVERDUE TRACKING SERVICE
 * 
 * Rolling 30-day window based on nextRenewalDate
 * Auto-resolves when payment is received
 */

/**
 * Detect members who are overdue based on rolling 30-day window
 * Shows members whose nextRenewalDate was between 30 days ago and today
 */
export async function detectOverdueMembers(gymId: string) {
  const today = todayIST();
  const thirtyDaysAgo = addDaysIST(today, -30);

  // Find members with nextRenewalDate in the rolling window who haven't paid
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

  // Filter out members who have paid since their renewal date
  const actuallyOverdue = overdueMembers.filter((member) => {
    if (!member.nextRenewalDate) return false;
    
    // If they have a payment after their renewal date, they're not overdue
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
 * Auto-resolve overdue tracking when a payment is made
 * This removes the member from overdue list and reactivates them if needed
 */
export async function resolveOverdueOnPayment(memberId: string) {
  try {
    // Find any active overdue tracking for this member
    const overdueRecords = await prisma.overdueTracking.findMany({
      where: {
        memberId,
        markedInactiveAt: null, // Only resolve unresolved records
      },
    });

    if (overdueRecords.length === 0) {
      return { resolved: false, message: "No overdue records found" };
    }

    // Delete all overdue tracking records for this member
    await prisma.overdueTracking.deleteMany({
      where: {
        memberId,
      },
    });

    // Reactivate member if they were marked as EXPIRED
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { status: true },
    });

    if (member?.status === MemberStatus.EXPIRED) {
      await prisma.member.update({
        where: { id: memberId },
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
