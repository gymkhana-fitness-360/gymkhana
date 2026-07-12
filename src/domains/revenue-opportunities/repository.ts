import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { loadGymReadinessCalibration } from "./calibration";
import { formatOutcomeSummary } from "./predictions";
import type {
  OpportunityPriority,
  OpportunityRecord,
  OpportunityStatus,
  InferenceSource,
  PredictionLabel,
} from "./types";

export async function upsertOpenOpportunity(
  gymId: string,
  memberId: string,
  data: {
    score: number;
    amountAtRisk: number;
    priority: OpportunityPriority;
    reasons: string[];
    payProbability: number;
    churnRisk: number;
    predictionLabel: PredictionLabel;
    readinessModelVersion: string;
    featureSnapshot: Record<string, number | null>;
    inferenceSource: InferenceSource;
    llmAssessment: Record<string, unknown> | null;
  },
) {
  const existing = await prisma.opportunity.findFirst({
    where: { gymId, memberId, status: "OPEN" },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    return prisma.opportunity.update({
      where: { id: existing.id },
      data: {
        score: data.score,
        amountAtRisk: data.amountAtRisk,
        priority: data.priority,
        reasons: data.reasons,
        payProbability: data.payProbability,
        churnRisk: data.churnRisk,
        predictionLabel: data.predictionLabel,
        readinessModelVersion: data.readinessModelVersion,
        featureSnapshot: data.featureSnapshot,
        inferenceSource: data.inferenceSource,
        llmAssessment: (data.llmAssessment ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  return prisma.opportunity.create({
    data: {
      gymId,
      memberId,
      score: data.score,
      amountAtRisk: data.amountAtRisk,
      priority: data.priority,
      reasons: data.reasons,
      payProbability: data.payProbability,
      churnRisk: data.churnRisk,
      predictionLabel: data.predictionLabel,
      readinessModelVersion: data.readinessModelVersion,
      featureSnapshot: data.featureSnapshot,
      inferenceSource: data.inferenceSource,
      llmAssessment: (data.llmAssessment ?? undefined) as Prisma.InputJsonValue | undefined,
      status: "OPEN",
    },
  });
}

function parseLlmAssessment(raw: unknown): {
  rationale?: string;
  recommendedAction?: string;
  error?: string;
  model?: string;
} | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  return {
    rationale: typeof o.rationale === "string" ? o.rationale : undefined,
    recommendedAction:
      typeof o.recommendedAction === "string" ? o.recommendedAction : undefined,
    error: typeof o.error === "string" ? o.error : undefined,
    model: typeof o.model === "string" ? o.model : undefined,
  };
}

export async function listOpportunities(
  gymId: string,
  filters?: {
    status?: OpportunityStatus;
    predictionLabel?: PredictionLabel;
    limit?: number;
  },
): Promise<OpportunityRecord[]> {
  const rows = await prisma.opportunity.findMany({
    where: {
      gymId,
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.predictionLabel
        ? { predictionLabel: filters.predictionLabel }
        : {}),
    },
    orderBy: [{ priority: "desc" }, { score: "desc" }, { updatedAt: "desc" }],
    take: filters?.limit ?? 50,
    include: {
      Member: { select: { name: true, phone: true } },
    },
  });

  const calibration = await loadGymReadinessCalibration(gymId);

  return rows.map((row) => ({
    id: row.id,
    gymId: row.gymId,
    memberId: row.memberId,
    score: row.score,
    amountAtRisk: Number(row.amountAtRisk),
    priority: row.priority as OpportunityPriority,
    reasons: row.reasons as string[],
    readinessScore: row.payProbability,
    payProbability: row.payProbability,
    churnRisk: row.churnRisk,
    predictionLabel: row.predictionLabel as PredictionLabel,
    readinessModelVersion: row.readinessModelVersion,
    inferenceSource: row.inferenceSource as InferenceSource,
    llmRationale: parseLlmAssessment(row.llmAssessment)?.rationale ?? null,
    llmRecommendedAction:
      parseLlmAssessment(row.llmAssessment)?.recommendedAction ?? null,
    llmError: parseLlmAssessment(row.llmAssessment)?.error ?? null,
    outcomeSummary:
      (row.inferenceSource === "HYBRID" || row.inferenceSource === "LLM") &&
      parseLlmAssessment(row.llmAssessment)?.rationale
        ? parseLlmAssessment(row.llmAssessment)!.rationale!
        : formatOutcomeSummary(
            row.predictionLabel as PredictionLabel,
            row.payProbability,
            row.churnRisk,
            calibration,
          ),
    status: row.status as OpportunityStatus,
    memberName: row.Member.name,
    memberPhone: row.Member.phone,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

export async function getOpportunitySummary(gymId: string) {
  const [open, highPriority, recoverable] = await Promise.all([
    prisma.opportunity.count({ where: { gymId, status: "OPEN" } }),
    prisma.opportunity.count({
      where: { gymId, status: "OPEN", priority: "HIGH" },
    }),
    prisma.opportunity.aggregate({
      where: { gymId, status: "OPEN" },
      _sum: { amountAtRisk: true },
    }),
  ]);

  const [likelyToPay, atRisk, unlikely] = await Promise.all([
    prisma.opportunity.count({
      where: { gymId, status: "OPEN", predictionLabel: "LIKELY_TO_PAY" },
    }),
    prisma.opportunity.count({
      where: { gymId, status: "OPEN", predictionLabel: "AT_RISK" },
    }),
    prisma.opportunity.count({
      where: { gymId, status: "OPEN", predictionLabel: "UNLIKELY" },
    }),
  ]);

  return {
    openCount: open,
    highPriorityCount: highPriority,
    recoverableRevenue: Number(recoverable._sum.amountAtRisk ?? 0),
    likelyToPayCount: likelyToPay,
    atRiskCount: atRisk,
    unlikelyCount: unlikely,
  };
}
