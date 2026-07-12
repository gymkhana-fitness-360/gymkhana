import { prisma } from "@/lib/prisma";
import type { GymFactType, Prisma } from "@prisma/client";
import { getOpportunitySummary } from "@/domains/revenue-opportunities/repository";
import { getChasePlan } from "@/domains/revenue-opportunities/chase-plan";
import { getOperatingHoursFact } from "@/domains/analytics/operating-hours-fact";
import { getActiveGoal } from "@/domains/goals/service";

export async function upsertGymFact(
  gymId: string,
  factKey: string,
  data: {
    factType?: GymFactType;
    value: Prisma.InputJsonValue;
    source: string;
  },
) {
  return prisma.gymFact.upsert({
    where: { gymId_factKey: { gymId, factKey } },
    create: {
      gymId,
      factKey,
      factType: data.factType ?? "METRIC",
      value: data.value,
      source: data.source,
      validAt: new Date(),
    },
    update: {
      value: data.value,
      source: data.source,
      validAt: new Date(),
    },
  });
}

/** Nightly refresh: aggregates Opportunity, chase, hours, goal into GymFact rows. */
export async function refreshGymFactsForGym(gymId: string) {
  const [summary, chase, hours, goal] = await Promise.all([
    getOpportunitySummary(gymId),
    getChasePlan(gymId, 10),
    getOperatingHoursFact(gymId),
    getActiveGoal(gymId),
  ]);

  const facts: {
    key: string;
    type: GymFactType;
    value: Prisma.InputJsonValue;
  }[] = [
    {
      key: "revenue.open_opportunities",
      type: "METRIC",
      value: { count: summary.openCount },
    },
    {
      key: "revenue.recoverable_inr",
      type: "METRIC",
      value: { inr: summary.recoverableRevenue },
    },
    {
      key: "revenue.high_priority_count",
      type: "METRIC",
      value: { count: summary.highPriorityCount },
    },
    {
      key: "predictions.cohorts",
      type: "INSIGHT",
      value: {
        likelyToPay: summary.likelyToPayCount,
        atRisk: summary.atRiskCount,
        unlikely: summary.unlikelyCount,
      },
    },
    {
      key: "chase.top_steps",
      type: "INSIGHT",
      value: {
        steps: chase.steps.slice(0, 5).map((s) => ({
          memberId: s.memberId,
          memberName: s.memberName,
          score: s.score,
          payProbability: s.payProbability,
          churnRisk: s.churnRisk,
          predictionLabel: s.predictionLabel,
          outcomeSummary: s.outcomeSummary,
          reasons: s.reasons,
          isOverdue: s.isOverdue,
        })),
      },
    },
    {
      key: "attendance.operating_hours",
      type: "AGGREGATE",
      value: hours ?? { note: "not_computed" },
    },
    {
      key: "goal.active",
      type: "METRIC",
      value: goal
        ? {
            id: goal.id,
            title: goal.title,
            targetInr: Number(goal.targetInr),
            recoveredInr: Number(goal.recoveredInr),
            metricType: goal.metricType,
            status: goal.status,
          }
        : { active: false },
    },
  ];

  await Promise.all(
    facts.map((f) =>
      upsertGymFact(gymId, f.key, {
        factType: f.type,
        value: f.value,
        source: "nightly_refresh",
      }),
    ),
  );

  return { gymId, factCount: facts.length };
}

export async function refreshGymFactsForAllGyms() {
  const gyms = await prisma.gym.findMany({ select: { id: true } });
  const results = [];
  for (const g of gyms) {
    results.push(await refreshGymFactsForGym(g.id));
  }
  return results;
}

export async function listGymFacts(gymId: string, factType?: GymFactType) {
  return prisma.gymFact.findMany({
    where: {
      gymId,
      ...(factType ? { factType } : {}),
    },
    orderBy: { factKey: "asc" },
  });
}
