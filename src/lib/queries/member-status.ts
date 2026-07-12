/**
 * MEMBER STATUS QUERIES
 * 
 * Centralized queries that determine member status based on membership validity.
 * BUSINESS RULE: A member is ACTIVE if they have a valid membership (endDate > today)
 * 
 * IMPORTANT: endDate is the LAST day of membership (inclusive)
 * Example: endDate = April 14 means member is active through April 14, expires on April 15
 */

import { Prisma } from "@prisma/client";
import { todayIST } from "../date-only";

/**
 * Get WHERE clause for members with valid memberships (effectively ACTIVE)
 * Use this instead of { status: "ACTIVE" }
 * 
 * Valid = endDate > today (member still has days remaining)
 */
export function getActiveMembersWhere(additionalWhere?: Prisma.MemberWhereInput): Prisma.MemberWhereInput {
  const today = todayIST();

  return {
    ...additionalWhere,
    Membership: {
      some: {
        endDate: {
          gt: today, // Changed from gte to gt - endDate must be in the future
        },
      },
    },
  };
}

/**
 * Get WHERE clause for members with expired memberships (effectively EXPIRED)
 * Use this instead of { status: "EXPIRED" }
 * 
 * Expired = endDate <= today (membership period has ended)
 */
export function getExpiredMembersWhere(additionalWhere?: Prisma.MemberWhereInput): Prisma.MemberWhereInput {
  const today = todayIST();

  return {
    ...additionalWhere,
    OR: [
      // No memberships at all
      {
        Membership: {
          none: {},
        },
      },
      // All memberships expired (endDate <= today)
      {
        Membership: {
          every: {
            endDate: {
              lte: today, // Changed from lt to lte
            },
          },
        },
      },
    ],
  };
}

/**
 * Count active members (those with valid memberships)
 */
export async function countActiveMembers(
  prisma: any,
  additionalWhere?: Prisma.MemberWhereInput
): Promise<number> {
  return prisma.member.count({
    where: getActiveMembersWhere(additionalWhere),
  });
}

/**
 * Count expired members (those without valid memberships)
 */
export async function countExpiredMembers(
  prisma: any,
  additionalWhere?: Prisma.MemberWhereInput
): Promise<number> {
  return prisma.member.count({
    where: getExpiredMembersWhere(additionalWhere),
  });
}
