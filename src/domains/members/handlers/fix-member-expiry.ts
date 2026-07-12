import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";
import { parseJsonBody } from "@/lib/security/parse-json-body";

const mutatingBodySchema = z.any();
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toDateOnlyIST, addDaysIST } from "@/lib/date-only";
import { BUSINESS_RULES } from "@/lib/business-rules";
import { createLogger } from "@/lib/logger";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";

const logger = createLogger("api-members");

/**
 * API endpoint to fix incorrect expiry dates
 * Recalculates membership end dates based on payment dates and amounts
 * For monthly payments (₹600-900), sets expiry to 30 days from payment date
 */
export async function fixMemberExpiryHandler(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session) {
      return ApiErrors.unauthorized();
    }

    const gymId = await resolveGymIdForUser(
      session.user.id,
      readRequestedGymIdFromRequest(request),
    );
    if (!gymId) {
      return ApiErrors.badRequest("No gym selected or account has no locations.");
    }

    const parsedBody = await parseJsonBody(request, mutatingBodySchema);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.data as any;
    const { memberId, recalculateAll } = body;

    if (recalculateAll) {
      // Recalculate all memberships based on their payments
      const allMembers = await prisma.member.findMany({
        where: { gymId },
        include: {
          Membership: {
            orderBy: { startDate: "desc" },
          },
          Payment: {
            orderBy: { receivedAt: "desc" },
          },
        },
      });

      let fixed = 0;
      let skipped = 0;

      for (const member of allMembers) {
        if (member.Payment.length === 0) continue;

        // Get the most recent payment
        const latestPayment = member.Payment[0];
        const paymentDate = toDateOnlyIST(latestPayment.receivedAt);

        // Get the most recent membership
        const latestMembership = member.Membership[0];
        if (!latestMembership) continue;

        // Check if expiry date seems incorrect (more than 1 year from payment date)
        const maxReasonableDate = addDaysIST(paymentDate, 365);

        if (latestMembership.endDate > maxReasonableDate) {
          // Recalculate based on payment amount
          const amount = Number(latestPayment.amount);
          let durationDays: number = BUSINESS_RULES.MEMBERSHIP.DEFAULT_DURATION_DAYS;

          // Check payment notes for package duration
          if (latestPayment.notes) {
            if (latestPayment.notes.includes("3 months") || latestPayment.notes.includes("Package: 3 months")) {
              durationDays = BUSINESS_RULES.MEMBERSHIP.DURATIONS.QUARTERLY as number;
            } else if (latestPayment.notes.includes("6 months") || latestPayment.notes.includes("Package: 6 months")) {
              durationDays = BUSINESS_RULES.MEMBERSHIP.DURATIONS.HALF_YEARLY as number;
            } else if (latestPayment.notes.includes("yearly") || latestPayment.notes.includes("Package: yearly")) {
              durationDays = BUSINESS_RULES.MEMBERSHIP.DURATIONS.YEARLY as number;
            }
          }

          const correctEndDate = addDaysIST(paymentDate, durationDays);

          await prisma.membership.update({
            where: { id: latestMembership.id },
            data: { endDate: correctEndDate },
          });

          fixed++;
          logger.info(`Fixed ${member.name}: ${latestMembership.endDate.toLocaleDateString()} → ${correctEndDate.toLocaleDateString()}`);
        } else {
          skipped++;
        }
      }

      return NextResponse.json({
        success: true,
        fixed,
        skipped,
        message: `Fixed ${fixed} memberships, skipped ${skipped}`,
      });
    } else if (memberId) {
      // Fix specific member
      const member = await prisma.member.findFirst({
        where: { id: memberId, gymId },
        include: {
          Membership: {
            orderBy: { startDate: "desc" },
            take: 1,
          },
          Payment: {
            orderBy: { receivedAt: "desc" },
            take: 1,
          },
        },
      });

      if (!member) {
        return ApiErrors.notFound("Member");
      }

      if (member.Payment.length === 0 || member.Membership.length === 0) {
        return ApiErrors.validationError("No payments or memberships found");
      }

      const latestPayment = member.Payment[0];
      const latestMembership = member.Membership[0];
      const paymentDate = toDateOnlyIST(latestPayment.receivedAt);

      // Determine duration from payment notes
      let durationDays: number = BUSINESS_RULES.MEMBERSHIP.DEFAULT_DURATION_DAYS;
      if (latestPayment.notes) {
        if (latestPayment.notes.includes("3 months") || latestPayment.notes.includes("Package: 3 months")) {
          durationDays = BUSINESS_RULES.MEMBERSHIP.DURATIONS.QUARTERLY as number;
        } else if (latestPayment.notes.includes("6 months") || latestPayment.notes.includes("Package: 6 months")) {
          durationDays = BUSINESS_RULES.MEMBERSHIP.DURATIONS.HALF_YEARLY as number;
        } else if (latestPayment.notes.includes("yearly") || latestPayment.notes.includes("Package: yearly")) {
          durationDays = BUSINESS_RULES.MEMBERSHIP.DURATIONS.YEARLY as number;
        }
      }

      const correctEndDate = addDaysIST(paymentDate, durationDays);

      await prisma.membership.update({
        where: { id: latestMembership.id },
        data: { endDate: correctEndDate },
      });

      return NextResponse.json({
        success: true,
        memberId: member.id,
        memberName: member.name,
        oldEndDate: latestMembership.endDate,
        newEndDate: correctEndDate,
        message: `Fixed expiry date for ${member.name}`,
      });
    } else {
      return ApiErrors.validationError(
        "Either memberId or recalculateAll must be provided"
      );
    }
  } catch (error) {
    logger.error("Error fixing expiry dates:", error as Error);
    return ApiErrors.internal("Failed to fix expiry dates");
  }
}
