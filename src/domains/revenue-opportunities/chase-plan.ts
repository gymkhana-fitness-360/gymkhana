import { prisma } from "@/lib/prisma";
import { listOffers } from "@/domains/offers/service";
import { getOperatingHoursFact } from "@/domains/analytics/operating-hours-fact";
import { loadGymReadinessCalibration } from "./calibration";
import { getOpportunitySummary, listOpportunities } from "./repository";
import type { InferenceSource, PredictionLabel } from "./types";

export type ChasePlanStep = {
  order: number;
  opportunityId: string;
  memberId: string;
  memberName: string;
  memberPhone: string | null;
  priority: string;
  score: number;
  amountAtRisk: number;
  reasons: string[];
  isOverdue: boolean;
  readinessScore: number;
  payProbability: number;
  churnRisk: number;
  predictionLabel: PredictionLabel;
  outcomeSummary: string;
  inferenceSource: InferenceSource;
  llmRationale?: string | null;
  llmRecommendedAction?: string | null;
  llmError?: string | null;
  suggestedAction: "send_reminder" | "record_payment";
  suggestedOfferName?: string;
};

export type ChasePlanFilters = {
  predictionLabel?: PredictionLabel;
};

export async function getChasePlan(
  gymId: string,
  limit = 25,
  filters?: ChasePlanFilters,
) {
  const calibration = await loadGymReadinessCalibration(gymId);

  const opportunities = await listOpportunities(gymId, {
    status: "OPEN",
    limit: filters?.predictionLabel ? 100 : limit,
    predictionLabel: filters?.predictionLabel,
  });

  const sorted = [...opportunities].sort(
    (a, b) => b.readinessScore - a.readinessScore || b.score - a.score,
  );
  const memberIds = sorted.map((o) => o.memberId);

  const overdueRows =
    memberIds.length > 0
      ? await prisma.overdueTracking.findMany({
          where: { gymId, resolvedAt: null, memberId: { in: memberIds } },
          select: { memberId: true },
        })
      : [];

  const overdueMembers = new Set(overdueRows.map((r) => r.memberId));
  const summary = await getOpportunitySummary(gymId);

  const [activeOffers, hoursFact] = await Promise.all([
    listOffers(gymId, "ACTIVE"),
    getOperatingHoursFact(gymId),
  ]);
  const quietLabel = hoursFact?.quiet
    ? `${hoursFact.quiet.dayLabel} ~${hoursFact.quiet.hour}:00`
    : null;
  const quietOffer =
    activeOffers[0]?.name ??
    (quietLabel ? `Quiet hours promo (${quietLabel})` : undefined);

  const steps: ChasePlanStep[] = sorted
    .slice(0, limit)
    .map((o, index) => ({
      order: index + 1,
      opportunityId: o.id,
      memberId: o.memberId,
      memberName: o.memberName ?? "Unknown",
      memberPhone: o.memberPhone ?? null,
      priority: o.priority,
      score: o.score,
      amountAtRisk: o.amountAtRisk,
      reasons: o.reasons,
      isOverdue: overdueMembers.has(o.memberId),
      readinessScore: o.readinessScore,
      payProbability: o.readinessScore,
      churnRisk: o.churnRisk,
      predictionLabel: o.predictionLabel,
      outcomeSummary: o.outcomeSummary,
      inferenceSource: o.inferenceSource,
      llmRationale: o.llmRationale,
      llmRecommendedAction: o.llmRecommendedAction,
      llmError: o.llmError,
      suggestedAction: "send_reminder" as const,
      suggestedOfferName:
        !overdueMembers.has(o.memberId) && quietOffer ? quietOffer : undefined,
    }));

  const briefRow = await prisma.gymFact.findUnique({
    where: { gymId_factKey: { gymId, factKey: "readiness.cohort_brief_llm" } },
  });
  const cohortBrief =
    briefRow?.value && typeof briefRow.value === "object"
      ? (briefRow.value as {
          headline?: string;
          focusToday?: string[];
          avoidWastingTimeOn?: string;
          generatedAt?: string;
        })
      : null;

  const llmAssessedCount = steps.filter((s) => s.inferenceSource === "LLM").length;

  return {
    summary,
    steps,
    quietHoursFact: hoursFact,
    predictions: {
      likelyToPay: summary.likelyToPayCount,
      atRisk: summary.atRiskCount,
      unlikely: summary.unlikelyCount,
    },
    calibration: {
      modelVersion: calibration.modelVersion,
      sampleSize: calibration.sampleSize,
      recoveryRate: calibration.recoveryRate,
      paymentWithin7dRate: calibration.paymentWithin7dRate,
    },
    inference: {
      llmAssessedCount,
      enabled: llmAssessedCount > 0,
    } as {
      llmAssessedCount: number;
      enabled: boolean;
      provider?: string | null;
      model?: string | null;
      hint?: string | null;
    },
    cohortBrief,
  };
}
