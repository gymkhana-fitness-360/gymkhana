/**
 * Fix Missing Memberships
 *
 * Creates memberships for completed payments that lack coverage using the
 * canonical createOrExtendMembership path (IST dates, inclusive end dates).
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";
import { createLogger } from "@/lib/logger";
import { inferPlanFromAmount } from "@/lib/services/plan-inference";
import { createOrExtendMembership } from "@/lib/services/membership.service";
import { addDaysIST, todayIST, toDateOnlyIST } from "@/lib/date-only";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";

const logger = createLogger("fix-missing-memberships");

/** Payments within this window may still warrant an active membership. */
const PAYMENT_LOOKBACK_DAYS = 120;

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

    const today = todayIST();
    const lookbackStart = addDaysIST(today, -PAYMENT_LOOKBACK_DAYS);

    const allPayments = await prisma.payment.findMany({
      where: {
        gymId,
        receivedAt: { gte: lookbackStart },
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
        receivedAt: "asc",
      },
    });

    logger.info("Found payments to check", { count: allPayments.length });

    let fixed = 0;
    let skipped = 0;
    let errors = 0;
    const results: Array<{
      member: string;
      amount: unknown;
      paymentDate: Date;
      inferredPlan: string;
      membershipCreated: { startDate: Date; endDate: Date };
    }> = [];

    for (const payment of allPayments) {
      try {
        const paymentDate = toDateOnlyIST(payment.receivedAt);
        const amount = Number(payment.amount);
        const inferred = inferPlanFromAmount(amount);
        const durationDays = inferred.durationDays;
        const expectedEndDate = addDaysIST(paymentDate, durationDays - 1);

        if (expectedEndDate < today) {
          skipped++;
          continue;
        }

        const existingMembership = payment.Member.Membership.find((m) => {
          const start = toDateOnlyIST(m.startDate);
          const end = toDateOnlyIST(m.endDate);
          return start <= expectedEndDate && end >= paymentDate;
        });

        if (existingMembership) {
          skipped++;
          continue;
        }

        const plan = await prisma.plan.findFirst({
          where: { id: inferred.planId, gymId: payment.gymId },
        });

        if (!plan) {
          logger.error(`Plan not found: ${inferred.planId}`);
          errors++;
          continue;
        }

        const { membership } = await createOrExtendMembership({
          memberId: payment.memberId,
          gymId: payment.gymId,
          planId: plan.id,
          amount,
          paymentDate,
          duration: null,
          userId: session.user.id,
          sourcePaymentId: payment.id,
        });

        fixed++;
        results.push({
          member: payment.Member.name,
          amount: payment.amount,
          paymentDate: payment.receivedAt,
          inferredPlan: inferred.planId,
          membershipCreated: {
            startDate: membership.startDate,
            endDate: membership.endDate,
          },
        });

        logger.info(`Fixed: ${payment.Member.name}`);
      } catch (error) {
        errors++;
        logger.error(
          `Failed for payment ${payment.id}: ${error instanceof Error ? error.message : String(error)}`,
          error as Error,
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

export const maxDuration = 300;
