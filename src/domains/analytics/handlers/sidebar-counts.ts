import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ApiErrors } from "@/lib/api-handler";
import { cachedJson } from "@/lib/api-cache";
import { prisma } from "@/lib/prisma";
import { requireApiGymId } from "@/lib/api/gym-context";
import { todayIST } from "@/lib/date-only";
import { createLogger } from "@/lib/logger";

const logger = createLogger("sidebar-counts");

/**
 * Lightweight aggregate counts for the sidebar. Replaces the previous approach of
 * fetching `/api/members|payments|attendance?limit=1000` and counting client-side.
 */
export async function sidebarCountsHandler(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const gymId = await requireApiGymId(session, request);
    if (gymId instanceof NextResponse) {
      return gymId;
    }

    const today = todayIST();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    const [totalMembers, activeMembers, payments, pendingTasks] = await Promise.all([
      prisma.member.count({ where: { gymId } }),
      prisma.member.count({
        where: { gymId, Membership: { some: { endDate: { gte: today } } } },
      }),
      prisma.payment.aggregate({
        where: { gymId, receivedAt: { gte: monthStart, lt: nextMonthStart } },
        _count: true,
        _sum: { amount: true },
      }),
      prisma.adminTask.count({ where: { gymId, status: "PENDING" } }),
    ]);

    return cachedJson({
      totalMembers,
      activeMembers,
      pendingAdminTasks: pendingTasks,
      paymentsThisMonth: payments._count,
      totalAmountThisMonth: Number(payments._sum.amount ?? 0),
    });
  } catch (error) {
    logger.error("Error fetching sidebar counts:", error as Error);
    return ApiErrors.internal("Failed to fetch sidebar counts");
  }
}
