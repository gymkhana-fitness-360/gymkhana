/**
 * STATUS UPDATER SERVICE
 * 
 * Real-time member status updates based on membership expiry.
 * Call this before displaying member data to ensure status is current.
 */

import { prisma } from "@/lib/prisma";
import { MemberStatus, Prisma } from "@prisma/client";
import { todayIST } from "@/lib/date-only";
import { validateStateTransition } from "@/lib/state-machine";
import { createLogger } from "@/lib/logger";

const logger = createLogger("status-updater");

type DbClient = Prisma.TransactionClient | typeof prisma;

/**
 * Check and update a single member's status if their membership has expired.
 * Returns true if status was updated.
 */
export async function updateMemberStatusIfExpired(
  memberId: string,
  db: DbClient = prisma
): Promise<boolean> {
  const member = await db.member.findUnique({
    where: { id: memberId },
    include: {
      Membership: {
        orderBy: { endDate: "desc" },
        take: 1,
      },
    },
  });

  if (!member) {
    logger.warn("Member not found for status update", { memberId });
    return false;
  }

  if (member.status !== MemberStatus.ACTIVE) {
    return false;
  }

  const latestMembership = member.Membership[0];
  if (!latestMembership) {
    return false;
  }

  const today = todayIST();
  const membershipEndDate = new Date(latestMembership.endDate);
  membershipEndDate.setHours(0, 0, 0, 0);

  if (membershipEndDate < today) {
    const transition = validateStateTransition(member.status, MemberStatus.EXPIRED);
    
    if (transition.valid) {
      await db.member.update({
        where: { id: memberId },
        data: { status: MemberStatus.EXPIRED },
      });

      logger.info("Member status updated to EXPIRED", {
        memberId,
        memberName: member.name,
        membershipEndDate: membershipEndDate.toISOString(),
      });

      return true;
    }
  }

  return false;
}

/**
 * Bulk update all members' statuses based on membership validity.
 * BUSINESS RULE: Status is derived from membership dates.
 * - Has valid membership (endDate > today) → ACTIVE (member still has days remaining)
 * - Has expired membership (endDate <= today) → EXPIRED (membership period ended)
 * 
 * IMPORTANT: endDate is the LAST day of membership (inclusive)
 * Example: endDate = April 14 means active through April 14, expires on April 15
 * 
 * Returns count of updated members.
 */
export async function updateAllExpiredMemberStatuses(): Promise<number> {
  const today = todayIST();
  let updated = 0;

  // 1. Mark members with EXPIRED memberships as EXPIRED (endDate <= today)
  const expiredMemberships = await prisma.membership.findMany({
    where: { endDate: { lte: today } }, // Changed from lt to lte
    include: { Member: true },
  });

  for (const membership of expiredMemberships) {
    if (membership.Member.status === MemberStatus.ACTIVE) {
      const transition = validateStateTransition(
        membership.Member.status,
        MemberStatus.EXPIRED
      );

      if (transition.valid) {
        await prisma.member.update({
          where: { id: membership.memberId },
          data: { status: MemberStatus.EXPIRED },
        });
        updated++;
      }
    }
  }

  // 2. Mark members with VALID memberships as ACTIVE (endDate > today)
  const validMemberships = await prisma.membership.findMany({
    where: { endDate: { gt: today } }, // Changed from gte to gt
    include: { Member: true },
  });

  for (const membership of validMemberships) {
    if (membership.Member.status === MemberStatus.EXPIRED) {
      const transition = validateStateTransition(
        membership.Member.status,
        MemberStatus.ACTIVE
      );

      if (transition.valid) {
        await prisma.member.update({
          where: { id: membership.memberId },
          data: { status: MemberStatus.ACTIVE },
        });
        updated++;
      }
    }
  }

  logger.info("Bulk status update completed", {
    expiredMemberships: expiredMemberships.length,
    validMemberships: validMemberships.length,
    updated,
  });

  return updated;
}

/**
 * Get member with real-time status check.
 * Use this instead of direct prisma.member.findUnique when you need current status.
 */
export async function getMemberWithCurrentStatus(memberId: string) {
  await updateMemberStatusIfExpired(memberId);
  
  return prisma.member.findUnique({
    where: { id: memberId },
    include: {
      Membership: {
        orderBy: { startDate: "desc" },
        take: 1,
      },
    },
  });
}
