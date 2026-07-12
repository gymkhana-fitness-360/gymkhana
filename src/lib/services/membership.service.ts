"use strict";

import { prisma } from "@/lib/prisma";
import { MemberStatus, Membership, Prisma } from "@prisma/client";
import { todayIST, addDaysIST, toDateOnlyIST } from "@/lib/date-only";
import { BUSINESS_RULES, getMembershipDuration } from "@/lib/business-rules";
import { logAction } from "@/lib/audit-logger";

type DbClient = Prisma.TransactionClient | typeof prisma;

/**
 * SHARED MEMBERSHIP SERVICE
 * 
 * Single source of truth for all membership creation/renewal logic.
 * Used by: quick-entry, manual member creation, WhatsApp import.
 * 
 * CRITICAL BUSINESS RULES:
 * 1. Duration: 30 days = 30 full days (not 29)
 *    Example: Start March 15 with 30 days → End April 14 (March 15-April 14 = 30 days)
 * 
 * 2. endDate is INCLUSIVE (last day of membership)
 *    Example: endDate = April 14 means member is active through April 14
 *             Member expires on April 15 (endDate + 1)
 * 
 * 3. Validity check: endDate > today (member still has days remaining)
 *    Example: Today = April 14, endDate = April 14 → EXPIRED (no days remaining)
 *             Today = April 13, endDate = April 14 → ACTIVE (1 day remaining)
 * 
 * 4. Extension: Continues seamlessly from current endDate (no gap)
 *    Example: Current endDate = April 14, add 30 days → New endDate = May 14
 */

export interface CreateMembershipInput {
  memberId: string;
  gymId: string;
  planId: string;
  amount: number;
  paymentDate: Date;
  duration?: string | null;
  userId: string; // Who created this
  sourcePaymentId?: string;
}

export interface MembershipResult {
  membership: Membership;
  wasExtended: boolean;
  previousEndDate?: Date;
  newEndDate: Date;
}

/**
 * Create or extend membership for a member
 * 
 * CRITICAL LOGIC:
 * - If member has active membership, extend from CURRENT end date (don't lose days)
 * - If member has no membership or expired, start from payment date
 * - Always create new Membership record (history tracking)
 * - Update Member.nextRenewalDate and lastPaymentDate
 */
export async function createOrExtendMembership(
  input: CreateMembershipInput,
  existingTx?: Prisma.TransactionClient
): Promise<MembershipResult> {
  const { memberId, gymId, planId, amount, paymentDate, duration, userId, sourcePaymentId } = input;

  const run = async (db: DbClient): Promise<MembershipResult> => {
    const memberRow = await db.member.findUnique({
      where: { id: memberId },
      select: { gymId: true },
    });
    if (!memberRow) {
      throw new Error("Member not found for membership");
    }
    if (memberRow.gymId !== gymId) {
      throw new Error("Gym mismatch for membership");
    }

    // Fetch plan and current membership in parallel for better performance
    const [plan, currentMembership] = await Promise.all([
      db.plan.findFirst({ where: { id: planId, gymId } }).then(async (p) => {
        if (!p) {
          // Auto-create the plan if it doesn't exist (especially for "monthly")
          return db.plan.create({
            data: {
              id: planId,
              gymId,
              name: planId === "monthly" ? "Monthly" : planId,
              durationDays: 30,
              price: amount,
              description: planId === "monthly" ? "Standard monthly membership" : `Auto-created plan: ${planId}`,
              isActive: true,
            },
          });
        }
        return p;
      }),
      db.membership.findFirst({
        where: { memberId },
        orderBy: { endDate: "desc" },
      }),
    ]);

    const durationDays = duration
      ? getMembershipDuration(duration)
      : plan.durationDays;

    const paymentDateOnly = toDateOnlyIST(paymentDate);
    const today = todayIST();

    let startDate: Date;
    let wasExtended = false;
    let previousEndDate: Date | undefined;

    // BUSINESS RULE: Full duration days (30 days = 30 full days)
    // Example: Start March 15 with 30 days = End April 14 (30 full days: Mar 15-Apr 14)
    // 
    // Validity: endDate > today (member still has days remaining)
    // Example: Today = April 14, endDate = April 14 → EXPIRED
    //          Today = April 13, endDate = April 14 → ACTIVE (1 day left)
    if (currentMembership && toDateOnlyIST(currentMembership.endDate) > today) {
      // Member is still active (has days remaining)
      // Extend from day after current end date (seamless continuation)
      startDate = addDaysIST(currentMembership.endDate, 1);
      wasExtended = true;
      previousEndDate = toDateOnlyIST(currentMembership.endDate);

      await db.membership.update({
        where: { id: currentMembership.id },
        data: { lifecycleStatus: "RENEWED" },
      });
    } else {
      // Member is expired or has no membership
      // Start new period from payment date
      startDate = paymentDateOnly;
    }

    // Calculate endDate: startDate + duration - 1
    // Example: Start April 15 + 30 days = End May 14 (April 15-May 14 = 30 days)
    const endDate = addDaysIST(startDate, durationDays - 1);
    const nextRenewalDate = addDaysIST(endDate, 1);

    const membership = await db.membership.create({
      data: {
        memberId,
        gymId,
        planId,
        startDate,
        endDate,
        amount,
        previousMembershipId: currentMembership?.id ?? null,
        sourcePaymentId: sourcePaymentId ?? null,
        lifecycleStatus: "ONGOING",
      },
    });

    // Update member and get previous status in one query
    const previousMember = await db.member.findUnique({
      where: { id: memberId },
      select: { status: true },
    });
    const previousStatus = previousMember?.status;

    await db.member.update({
      where: { id: memberId },
      data: {
        nextRenewalDate,
        lastPaymentDate: paymentDateOnly,
        status: MemberStatus.ACTIVE,
      },
    });

    // Log status transitions asynchronously (fire and forget)
    if (previousStatus && previousStatus !== MemberStatus.ACTIVE) {
      logAction(
        userId,
        "member_status_changed",
        "Member",
        memberId,
        {
          previousStatus,
          newStatus: "ACTIVE",
          trigger: "payment",
          reason: "Member activated via payment",
        }
      ).catch(() => {});
    }

    logAction(
      userId,
      wasExtended ? "membership_extended" : "membership_created",
      "Membership",
      membership.id,
      {
        memberId,
        planId: plan.id,
        planName: plan.name,
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        durationDays,
        amount,
        wasExtended,
      }
    ).catch(() => {});

    return {
      membership,
      wasExtended,
      previousEndDate,
      newEndDate: endDate,
    };
  };

  if (existingTx) {
    return run(existingTx);
  }

  return prisma.$transaction(async (tx) => run(tx), {
    timeout: 30000, // 30 seconds for slow remote DB connections
  });
}

/**
 * Check if member has active membership
 */
export async function hasActiveMembership(memberId: string): Promise<boolean> {
  const today = todayIST();
  const membership = await prisma.membership.findFirst({
    where: {
      memberId,
      endDate: { gte: today },
    },
  });
  return !!membership;
}

/**
 * Get member's current/latest membership
 */
export async function getCurrentMembership(memberId: string) {
  return prisma.membership.findFirst({
    where: { memberId },
    orderBy: { endDate: "desc" },
    include: { Plan: true },
  });
}

/**
 * Calculate membership end date from payment
 * Uses business rules for consistent calculation
 * 
 * Formula: endDate = startDate + (duration - 1)
 * Example: Start March 15 + 30 days = End April 13 (March 15-April 13 = 30 days)
 * 
 * endDate is INCLUSIVE (last day of membership)
 */
export function calculateMembershipEndDate(
  startDate: Date,
  durationDays: number
): Date {
  return addDaysIST(startDate, durationDays - 1);
}

/**
 * Determine if a membership should be extended or created new
 */
export async function shouldExtendMembership(
  memberId: string
): Promise<{ shouldExtend: boolean; currentEndDate?: Date }> {
  const today = todayIST();
  const current = await getCurrentMembership(memberId);
  
  if (!current) {
    return { shouldExtend: false };
  }
  
  const endDate = toDateOnlyIST(current.endDate);
  const isActive = endDate >= today;
  
  return {
    shouldExtend: isActive && BUSINESS_RULES.MEMBERSHIP.EXTEND_FROM_CURRENT_END_DATE,
    currentEndDate: isActive ? endDate : undefined,
  };
}
