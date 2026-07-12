import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import { ApiErrors } from "@/lib/api-handler";
import { MemberStatus } from "@prisma/client";
import { todayIST, addDaysIST } from "@/lib/date-only";
import { requireApiGymId } from "@/lib/api/gym-context";

const logger = createLogger("api-overdue-list");

/**
 * GET /api/overdue/list
 * Simple: Show members whose nextRenewalDate is in the past 30 days
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return ApiErrors.unauthorized();
    }

    const gymId = await requireApiGymId(session, request);
    if (gymId instanceof NextResponse) {
      return gymId;
    }

    const today = todayIST();
    const thirtyDaysAgo = addDaysIST(today, -30);

    // Get members with nextRenewalDate in rolling 30-day window
    const members = await prisma.member.findMany({
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
        Membership: {
          orderBy: { endDate: "desc" },
          take: 1,
          include: {
            Plan: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { nextRenewalDate: "asc" },
      take: 500,
    });

    // Transform to UI format
    const overdueMembers = members.map((m) => {
      const daysOverdue = Math.floor(
        (today.getTime() - m.nextRenewalDate!.getTime()) / (1000 * 60 * 60 * 24)
      );

      const latestMembership = m.Membership[0];

      return {
        memberId: m.id,
        name: m.name,
        phone: m.phone,
        lastPaymentDate: m.lastPaymentDate,
        membershipEndDate: m.nextRenewalDate!,
        daysSinceExpiry: daysOverdue,
        amount: latestMembership ? Number(latestMembership.amount) : 0,
        planName: latestMembership?.Plan.name || "Unknown",
      };
    });

    // Sort by days overdue (most urgent first)
    overdueMembers.sort((a, b) => b.daysSinceExpiry - a.daysSinceExpiry);

    return NextResponse.json({
      success: true,
      overdueMembers,
      totalOverdue: overdueMembers.length,
    });
  } catch (error) {
    logger.error("Error fetching overdue members:", error as Error);
    return ApiErrors.internal("Failed to fetch overdue members");
  }
}
