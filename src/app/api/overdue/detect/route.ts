import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";
import { parseJsonBody } from "@/lib/security/parse-json-body";

const mutatingBodySchema = z
  .object({
    month: z.string().optional(),
    year: z.union([z.string(), z.number()]).optional(),
    useRollingWindow: z.boolean().optional(),
  })
  .passthrough();
import { ApiErrors } from "@/lib/api-handler";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { createLogger } from "@/lib/logger";
import { detectOverdueMembers } from "@/domains/collections/services/overdue.service";
import { todayIST, addDaysIST } from "@/lib/date-only";
import { requireApiGymId } from "@/lib/api/gym-context";

const logger = createLogger("api-overdue");

/**
 * Detect overdue members using rolling 30-day window
 * 
 * NEW DEFAULT: Rolling window based on nextRenewalDate (30 days ago to today)
 * LEGACY MODE: Calendar month detection (for backward compatibility)
 */
export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const gymId = await requireApiGymId(session, request);
    if (gymId instanceof NextResponse) {
      return gymId;
    }

    const parsedBody = await parseJsonBody(request, mutatingBodySchema);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.data as any;
    const { month, year, useRollingWindow } = body;

    // NEW: Rolling window mode (default when no month/year specified)
    if (useRollingWindow !== false && !month && !year) {
      const overdueMembers = await detectOverdueMembers(gymId);
      const today = todayIST();
      const thirtyDaysAgo = addDaysIST(today, -30);

      logger.info(`[OVERDUE] Rolling window detection: ${overdueMembers.length} members overdue`);

      return NextResponse.json({
        success: true,
        mode: "rolling_window",
        windowStart: thirtyDaysAgo.toISOString().split('T')[0],
        windowEnd: today.toISOString().split('T')[0],
        totalOverdue: overdueMembers.length,
        overdueMembers: overdueMembers.map(m => ({
          id: m.id,
          name: m.name,
          phone: m.phone,
          status: m.status,
          nextRenewalDate: m.nextRenewalDate,
          daysOverdue: Math.floor(
            (today.getTime() - m.nextRenewalDate!.getTime()) / (1000 * 60 * 60 * 24)
          ),
          lastPayment: m.Payment[0] || null,
        })),
      });
    }

    // LEGACY: Calendar month mode (for backward compatibility)
    if (!month || !year) {
      return ApiErrors.validationError("Month and year are required for calendar mode");
    }

    const monthStr = `${month} ${year}`;
    const startDate = new Date(year, getMonthNumber(month) - 1, 1);
    const endDate = new Date(year, getMonthNumber(month), 0, 23, 59, 59);

    // Get all active members
    const activeMembers = await prisma.member.findMany({
      where: {
        gymId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        gymId: true,
        name: true,
        phone: true,
      },
    });

    // Get members who paid in this month
    const paidMembers = await prisma.payment.findMany({
      where: {
        gymId,
        receivedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        memberId: true,
      },
      distinct: ["memberId"],
    });

    const paidMemberIds = new Set(paidMembers.map((p) => p.memberId));

    // Find members who didn't pay
    const overdueMembers = activeMembers.filter(
      (m) => !paidMemberIds.has(m.id)
    );

    // Create or update overdue tracking records (batched — no per-member round-trips).
    const overdueIds = overdueMembers.map((m) => m.id);
    const memberInclude = {
      Member: { select: { id: true, name: true, phone: true } },
    } as const;

    const existingRecords = await prisma.overdueTracking.findMany({
      where: { gymId, month: monthStr, memberId: { in: overdueIds } },
      include: memberInclude,
    });
    const existingMemberIds = new Set(existingRecords.map((r) => r.memberId));
    const newMembers = overdueMembers.filter((m) => !existingMemberIds.has(m.id));

    if (newMembers.length > 0) {
      await prisma.overdueTracking.createMany({
        data: newMembers.map((m) => ({
          memberId: m.id,
          gymId: m.gymId,
          month: monthStr,
          notes: `Detected as overdue - no payment in ${monthStr}`,
        })),
        skipDuplicates: true,
      });
    }

    // Single re-fetch of all records for the month (created + existing) for the response.
    const overdueRecords = await prisma.overdueTracking.findMany({
      where: { gymId, month: monthStr, memberId: { in: overdueIds } },
      include: memberInclude,
    });

    return NextResponse.json({
      success: true,
      mode: "calendar_month",
      month: monthStr,
      totalActive: activeMembers.length,
      totalPaid: paidMembers.length,
      totalOverdue: overdueMembers.length,
      created: newMembers.length,
      existing: existingRecords.length,
      overdueMembers: overdueRecords,
    });
  } catch (error) {
    logger.error("Error detecting overdue members:", error as Error);
    return ApiErrors.internal("Failed to detect overdue members");
  }
}

function getMonthNumber(month: string): number {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return months.indexOf(month) + 1;
}
