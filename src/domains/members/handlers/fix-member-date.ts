import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/security/parse-json-body";

const fixMemberDateSchema = z
  .object({
    memberId: z.string().min(1).optional(),
    memberName: z.string().min(1).optional(),
    dateType: z.enum(["joinDate", "paymentDate", "membershipStartDate", "membershipEndDate"]),
    correctDate: z.string().min(1),
  })
  .refine((d) => d.memberId || d.memberName, {
    message: "Either memberId or memberName must be provided",
  });

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";
import { requirePermission, PermissionError } from "@/lib/permissions";
import { createLogger } from "@/lib/logger";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { toDateOnlyIST } from "@/lib/date-only";

const logger = createLogger("api-members");
import {
  isProtectedMember,
  logMemberModification,
  MemberProtectionError,
} from "@/lib/member-protection";

/**
 * API endpoint to fix incorrect dates for members
 * Allows manual correction of join dates, payment dates, and membership dates
 */
export async function fixMemberDateHandler(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session) {
      return ApiErrors.unauthorized();
    }

    // Check permissions
    requirePermission(session, "canEditMembers");

    const parsedBody = await parseJsonBody(request, fixMemberDateSchema);
    if (!parsedBody.ok) return parsedBody.response;
    const { memberId, dateType, correctDate, memberName } = parsedBody.data;

    if (!memberId && !memberName) {
      return ApiErrors.validationError(
        "Either memberId or memberName must be provided"
      );
    }

    const gymId = await resolveGymIdForUser(
      session.user.id,
      readRequestedGymIdFromRequest(request),
    );
    if (!gymId) {
      return ApiErrors.badRequest("No gym selected or account has no locations.");
    }

    const include = {
      Membership: { orderBy: { startDate: "desc" as const }, take: 1 },
      Payment: { orderBy: { receivedAt: "desc" as const }, take: 1 },
    };

    let member = null;
    if (memberId) {
      member = await prisma.member.findFirst({
        where: { id: memberId, gymId },
        include,
      });
    } else if (memberName) {
      member = await prisma.member.findFirst({
        where: {
          gymId,
          name: { contains: memberName, mode: "insensitive" },
        },
        include,
      });
    }

    if (!member || member.gymId !== gymId) {
      return ApiErrors.notFound("Member");
    }

    // Protect protected members from date modifications
    if (isProtectedMember(member.id)) {
      throw new MemberProtectionError(
        `Cannot modify dates for protected member ${member.id} (${member.name}). ` +
        `Protected members cannot be modified manually. ` +
        `Please contact an administrator if dates need correction.`
      );
    }

    const correctedDate = toDateOnlyIST(correctDate);

    const updates: any = {};

    switch (dateType) {
      case "joinDate":
        await prisma.member.update({
          where: { id: member.id },
          data: { joinDate: correctedDate },
        });
        updates.joinDate = correctedDate;
        break;

      case "paymentDate":
        if (member.Payment.length > 0) {
          await prisma.payment.update({
            where: { id: member.Payment[0].id },
            data: { receivedAt: correctedDate },
          });
          updates.paymentDate = correctedDate;
        }
        break;

      case "membershipStartDate":
        if (member.Membership.length > 0) {
          const membership = member.Membership[0];
          // Recalculate end date based on plan duration
          const plan = await prisma.plan.findFirst({
            where: { id: membership.planId, gymId },
          });
          if (plan) {
            const newEndDate = new Date(correctedDate);
            newEndDate.setDate(newEndDate.getDate() + plan.durationDays);
            await prisma.membership.update({
              where: { id: membership.id },
              data: {
                startDate: correctedDate,
                endDate: newEndDate,
              },
            });
            updates.membershipStartDate = correctedDate;
            updates.membershipEndDate = newEndDate;
          }
        }
        break;

      case "membershipEndDate":
        if (member.Membership.length > 0) {
          await prisma.membership.update({
            where: { id: member.Membership[0].id },
            data: { endDate: correctedDate },
          });
          updates.membershipEndDate = correctedDate;
        }
        break;

      default:
        return ApiErrors.validationError(
          "Invalid dateType. Must be: joinDate, paymentDate, membershipStartDate, or membershipEndDate"
        );
    }

    // Audit log
    await logMemberModification({
      memberId: member.id,
      memberExternalId: member.id,
      memberName: member.name,
      operation: "update",
      userId: session.user.id,
      userName: session.user.name || "Unknown",
      timestamp: new Date(),
      reason: `Date fix: ${dateType}`,
      changes: { [dateType]: { old: 'various', new: correctedDate } },
    });

    return NextResponse.json({
      success: true,
      memberId: member.id,
      memberName: member.name,
      updates,
      message: `Fixed ${dateType} for ${member.name}`,
    });
  } catch (error) {
    if (error instanceof PermissionError) {
      return ApiErrors.forbidden(
        error instanceof Error ? error.message : String(error)
      );
    }
    if (error instanceof MemberProtectionError) {
      return ApiErrors.forbidden(
        error instanceof Error ? error.message : String(error)
      );
    }
    logger.error("Error fixing date:", error as Error);
    return ApiErrors.internal("Failed to fix date");
  }
}
