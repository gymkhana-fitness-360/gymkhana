/**
 * Fix Missing Memberships
 * 
 * BUSINESS RULE (Correct Logic):
 * - Anyone who paid in March (last 30 days) = should have valid membership
 * - Anyone who paid in Feb with 30+ day plan = should have valid membership
 * - Anyone who paid earlier with 3-month or 6-month plan = should have valid membership
 * 
 * This endpoint creates memberships for payments that are missing them.
 */

import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";
import { parseJsonBody } from "@/lib/security/parse-json-body";

const mutatingBodySchema = z.any();
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";
import { createLogger } from "@/lib/logger";
import { MemberStatus } from "@prisma/client";
import { inferPlanFromAmount } from "@/lib/services/plan-inference";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";

const logger = createLogger("fix-missing-memberships");

export async function fixMissingMembershipsHandler(request: NextRequest) {
  const rl = withRateLimit(request, "moderate");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }
    if (session.user.role !== "ADMIN") {
      return ApiErrors.forbidden("Admin access required");
    }

    const gymId = await resolveGymIdForUser(
      session.user.id,
      readRequestedGymIdFromRequest(request),
    );
    if (!gymId) {
      return ApiErrors.badRequest("No gym selected or account has no locations.");
    }

    logger.info(`Starting fix for missing memberships gym=${gymId}`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const febStart = new Date('2026-02-01');
    
    const allPayments = await prisma.payment.findMany({
      where: {
        gymId,
        receivedAt: { gte: febStart },
        status: "COMPLETED",
      },
      include: {
        Member: {
          include: {
            Membership: true,
          },
        },
      },
      orderBy: {
        receivedAt: 'asc',
      },
    });

    logger.info("Found payments to check", { count: allPayments.length });

    let fixed = 0;
    let skipped = 0;
    let errors = 0;
    const results: any[] = [];

    // Process payments in batches to avoid timeout
    for (const payment of allPayments) {
      try {
        const paymentDate = new Date(payment.receivedAt);
        paymentDate.setHours(0, 0, 0, 0);
        
        const amount = Number(payment.amount);
        const inferred = inferPlanFromAmount(amount);
        const durationDays = inferred.durationDays;
        
        const expectedEndDate = new Date(paymentDate);
        expectedEndDate.setDate(expectedEndDate.getDate() + durationDays);
        
        // Skip if payment is too old
        if (expectedEndDate < today) {
          skipped++;
          continue;
        }
        
        // Check if membership already exists
        const existingMembership = payment.Member.Membership.find(m => {
          const start = new Date(m.startDate);
          const end = new Date(m.endDate);
          start.setHours(0, 0, 0, 0);
          end.setHours(0, 0, 0, 0);
          return start <= expectedEndDate && end >= paymentDate;
        });

        if (existingMembership) {
          skipped++;
          continue;
        }

        // Get plan
        const plan = await prisma.plan.findFirst({
          where: { id: inferred.planId, gymId: payment.gymId },
        });

        if (!plan) {
          logger.error(`Plan not found: ${inferred.planId}`);
          errors++;
          continue;
        }

        // Calculate membership dates
        const currentMembership = await prisma.membership.findFirst({
          where: { memberId: payment.memberId },
          orderBy: { endDate: "desc" },
        });

        let startDate: Date;
        if (currentMembership && new Date(currentMembership.endDate) > today) {
          // Member still active (endDate > today), extend from day after current end
          startDate = new Date(currentMembership.endDate);
          startDate.setDate(startDate.getDate() + 1);
        } else {
          startDate = paymentDate;
        }

        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + durationDays - 1);

        // Create membership directly (faster than using service)
        await prisma.membership.create({
          data: {
            memberId: payment.memberId,
            gymId: payment.gymId,
            planId: plan.id,
            startDate,
            endDate,
            amount,
          },
        });

        // Update member status
        await prisma.member.update({
          where: { id: payment.memberId },
          data: { 
            status: MemberStatus.ACTIVE,
            nextRenewalDate: new Date(endDate.getTime() + 86400000),
            lastPaymentDate: paymentDate,
          },
        });

        fixed++;
        results.push({
          member: payment.Member.name,
          amount: payment.amount,
          paymentDate: payment.receivedAt,
          inferredPlan: inferred.planId,
          membershipCreated: {
            startDate,
            endDate,
          },
        });

        logger.info(`Fixed: ${payment.Member.name}`);
      } catch (error) {
        errors++;
        logger.error(
          `Failed for payment ${payment.id}: ${error instanceof Error ? error.message : String(error)}`,
          error as Error
        );
      }
    }

    logger.info("Fix completed", { fixed, skipped, errors });

    return NextResponse.json({
      success: true,
      summary: {
        totalPayments: allPayments.length,
        fixed,
        skipped,
        errors,
      },
      results: results.slice(0, 10),
    });
  } catch (error) {
    logger.error("Fix failed", error as Error);
    return ApiErrors.internal("Failed to fix missing memberships");
  }
}

// Increase timeout for this endpoint
export const maxDuration = 300; // 5 minutes
