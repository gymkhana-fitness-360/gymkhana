import { NextRequest, NextResponse } from "next/server";
import { getGymContext, GymContextError } from "@/domains/tenancy";
import { ApiErrors } from "@/lib/api-handler";
import { cachedJson } from "@/lib/api-cache";
import { prisma } from "@/lib/prisma";
import { withCache } from "@/lib/redis";
import { createLogger } from "@/lib/logger";
import { endOfDayIST, toDateOnlyIST } from "@/lib/date-only";

const logger = createLogger("api-analytics");

interface AnalyticsSummary {
  period: {
    startDate: string;
    endDate: string;
    days: number;
  };
  payments?: {
    total: number;
    count: number;
    average: number;
  };
  paymentsByMethod?: Array<{
    method: string;
    total: number;
    count: number;
  }>;
  newMembers?: {
    count: number;
  };
  renewals?: {
    count: number;
  };
  attendance?: {
    count: number;
  };
  uniqueAttendees?: {
    count: number;
  };
  overdueMembers?: {
    count: number;
  };
  revenue?: {
    total: number;
  };
  churnAnalysis?: {
    churnedMembers: number;
    churnRate: number;
    membersList: Array<{
      id: string;
      name: string;
      lastPayment: string | null;
      daysSinceLastPayment: number | null;
    }>;
  };
  delayPatterns?: {
    averageDelay: number;
    totalPaymentsAnalyzed: number;
    mostCommonPaymentDates: Array<{
      date: number;
      count: number;
    }>;
    mostCommonDaysOfWeek: Array<{
      day: string;
      count: number;
    }>;
    topPlans: Array<{
      plan: string;
      count: number;
      amount: number;
    }>;
    delayDistribution: {
      onTime: number;
      late1to3: number;
      late4to7: number;
      late8plus: number;
    };
  };
  [key: string]: unknown; // Allow dynamic metric keys
}

export async function analyticsSummaryHandler(request: NextRequest) {
  try {
    const { gymId } = await getGymContext(request);

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const metricsParam = searchParams.get("metrics")?.split(",") || [];

    if (!startDate || !endDate) {
      return ApiErrors.badRequest(
        "startDate and endDate are required (YYYY-MM-DD)"
      );
    }

    const cacheKey = `analytics:${gymId}:${startDate}:${endDate}:${[...metricsParam].sort().join(",")}`;

    const result = await withCache<AnalyticsSummary>(
      cacheKey,
      300,
      async () => {
        logger.info("Fetching analytics data", { startDate, endDate, metrics: metricsParam });

        const start = toDateOnlyIST(startDate);
        const end = endOfDayIST(endDate);

        const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

        const response: AnalyticsSummary = {
          period: {
            startDate,
            endDate,
            days: daysDiff > 0 ? daysDiff : 1,
          },
        };

        const enabledMetrics = new Set(metricsParam.length > 0 ? metricsParam : [
          "payments",
          "members",
          "renewals",
          "attendance",
        ]);

        // SINGLE CONSOLIDATED QUERY - fetch all payments once with all needed relations
        // This single query powers: payments, renewals, revenue, delays, churn
        const allPayments = await prisma.payment.findMany({
          where: {
            gymId,
            receivedAt: { gte: start, lte: end },
            status: "COMPLETED",
          },
          select: {
            id: true,
            amount: true,
            method: true,
            receivedAt: true,
            Member: {
              select: {
                id: true,
                name: true,
                joinDate: true,
                nextRenewalDate: true,
                lastPaymentDate: true,
              },
            },
            Plan: {
              select: {
                name: true,
                durationDays: true,
              },
            },
          },
        });

        // Calculate all payment-based metrics from this single dataset
        const total = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);
        const renewalCount = allPayments.filter(p => p.Member.joinDate < p.receivedAt).length;

        if (enabledMetrics.has("payments")) {
          response.payments = {
            total,
            count: allPayments.length,
            average: allPayments.length > 0 ? total / allPayments.length : 0,
          };

          const methodGroups: Record<string, { total: number; count: number }> = {};
          allPayments.forEach(p => {
            if (!methodGroups[p.method]) {
              methodGroups[p.method] = { total: 0, count: 0 };
            }
            methodGroups[p.method].total += Number(p.amount);
            methodGroups[p.method].count++;
          });
          
          response.paymentsByMethod = Object.entries(methodGroups).map(([method, data]) => ({
            method,
            ...data,
          }));
        }

        if (enabledMetrics.has("renewals")) {
          response.renewals = { count: renewalCount };
        }

        if (enabledMetrics.has("revenue")) {
          response.revenue = { total };
        }

        if (enabledMetrics.has("delays")) {
          let totalDelay = 0;
          let delayCount = 0;
          const paymentDates: Record<number, number> = {};
          const paymentDaysOfWeek: Record<string, number> = {};
          const planUsage: Record<string, { count: number; amount: number }> = {};
          const delayDistribution = {
            onTime: 0,
            late1to3: 0,
            late4to7: 0,
            late8plus: 0,
          };

          allPayments.forEach(payment => {
            const paymentDate = payment.receivedAt.getDate();
            paymentDates[paymentDate] = (paymentDates[paymentDate] || 0) + 1;

            const dayOfWeek = payment.receivedAt.toLocaleDateString('en-US', { weekday: 'long' });
            paymentDaysOfWeek[dayOfWeek] = (paymentDaysOfWeek[dayOfWeek] || 0) + 1;

            if (payment.Plan) {
              const planKey = payment.Plan.name;
              if (!planUsage[planKey]) {
                planUsage[planKey] = { count: 0, amount: 0 };
              }
              planUsage[planKey].count++;
              planUsage[planKey].amount += Number(payment.amount);
            }

            if (payment.Member.nextRenewalDate) {
              const expectedDate = payment.Member.nextRenewalDate;
              const actualDate = payment.receivedAt;
              const delay = Math.floor((actualDate.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24));

              if (delay >= 0) {
                totalDelay += delay;
                delayCount++;

                if (delay === 0) delayDistribution.onTime++;
                else if (delay <= 3) delayDistribution.late1to3++;
                else if (delay <= 7) delayDistribution.late4to7++;
                else delayDistribution.late8plus++;
              }
            }
          });

          const mostCommonPaymentDates = Object.entries(paymentDates)
            .map(([date, count]) => ({ date: parseInt(date), count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

          const mostCommonDaysOfWeek = Object.entries(paymentDaysOfWeek)
            .map(([day, count]) => ({ day, count }))
            .sort((a, b) => b.count - a.count);

          const topPlans = Object.entries(planUsage)
            .map(([plan, data]) => ({ plan, ...data }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

          response.delayPatterns = {
            averageDelay: delayCount > 0 ? Math.round((totalDelay / delayCount) * 10) / 10 : 0,
            totalPaymentsAnalyzed: delayCount,
            mostCommonPaymentDates,
            mostCommonDaysOfWeek,
            topPlans,
            delayDistribution,
          };
        }

        // Churn analysis - only if explicitly requested (requires additional query)
        if (enabledMetrics.has("churn")) {
          const periodDuration = end.getTime() - start.getTime();
          const prevStart = new Date(start.getTime() - periodDuration);
          const prevEnd = new Date(start.getTime() - 1);

          const [prevPayers, currentPayers] = await Promise.all([
            prisma.payment.groupBy({
              by: ["memberId"],
              where: {
                gymId,
                receivedAt: { gte: prevStart, lte: prevEnd },
                status: "COMPLETED",
              },
            }),
            prisma.payment.groupBy({
              by: ["memberId"],
              where: {
                gymId,
                receivedAt: { gte: start, lte: end },
                status: "COMPLETED",
              },
            }),
          ]);

          const currentPayerIds = new Set(currentPayers.map(p => p.memberId));
          const churnedMemberIds = prevPayers
            .map(p => p.memberId)
            .filter(id => !currentPayerIds.has(id))
            .slice(0, 20);

          const churnedMembersData = churnedMemberIds.length > 0 
            ? await prisma.member.findMany({
                where: { gymId, id: { in: churnedMemberIds } },
                select: {
                  id: true,
                  name: true,
                  lastPaymentDate: true,
                },
              })
            : [];

          const membersList = churnedMembersData.map(m => ({
            id: m.id,
            name: m.name,
            lastPayment: m.lastPaymentDate?.toISOString() || null,
            daysSinceLastPayment: m.lastPaymentDate
              ? Math.floor((end.getTime() - m.lastPaymentDate.getTime()) / (1000 * 60 * 60 * 24))
              : null,
          }));

          const churnRate = prevPayers.length > 0 
            ? ((prevPayers.length - currentPayers.length) / prevPayers.length) * 100 
            : 0;

          response.churnAnalysis = {
            churnedMembers: prevPayers.length - currentPayers.length,
            churnRate: Math.round(churnRate * 10) / 10,
            membersList,
          };
        }

        // Only fetch these if explicitly requested (separate queries)
        if (enabledMetrics.has("members")) {
          response.newMembers = { 
            count: await prisma.member.count({
              where: { gymId, joinDate: { gte: start, lte: end } },
            })
          };
        }

        if (enabledMetrics.has("attendance")) {
          const [count, uniqueCount] = await Promise.all([
            prisma.attendance.count({
              where: { gymId, checkIn: { gte: start, lte: end } },
            }),
            prisma.attendance.groupBy({
              by: ["memberId"],
              where: { gymId, checkIn: { gte: start, lte: end } },
            }).then(g => g.length),
          ]);
          
          response.attendance = { count };
          response.uniqueAttendees = { count: uniqueCount };
        }

        if (enabledMetrics.has("overdue")) {
          response.overdueMembers = {
            count: await prisma.overdueTracking.count({
              where: {
                gymId,
                detectedAt: { gte: start, lte: end },
                resolvedAt: null,
              },
            }),
          };
        }

        logger.info("Analytics data fetched successfully", {
          startDate,
          endDate,
          metricsCount: enabledMetrics.size,
        });

        return response;
      }
    );

    return cachedJson(result);
  } catch (error) {
    if (error instanceof GymContextError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    logger.error("Failed to fetch analytics summary", error as Error);
    return ApiErrors.internal("Failed to fetch analytics summary");
  }
}
