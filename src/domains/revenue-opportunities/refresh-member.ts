import { prisma } from "@/lib/prisma";
import { toDateOnlyIST, daysFromTodayIST } from "@/lib/date-only";
import {
  assessMemberReadinessWithLlm,
  type LlmReadinessResult,
} from "@/lib/inference/member-readiness-llm";
import type { GymReadinessCalibration } from "./calibration";
import { featureSnapshotFromInput } from "./calibration";
import { buildMemberOpportunityInput } from "./member-input";
import { scoreOpportunity } from "./scoring";
import { upsertOpenOpportunity } from "./repository";
import type {
  InferenceSource,
  MemberOpportunityInput,
  OpportunityScoreResult,
} from "./types";

function churnRiskLevel(churnRisk: number): string {
  if (churnRisk >= 70) return "HIGH_CHURN";
  if (churnRisk >= 40) return "RISK";
  return "SAFE";
}

async function upsertChurnRow(
  gymId: string,
  memberId: string,
  scored: OpportunityScoreResult,
  attendanceLast30Days: number,
  daysSinceLastPayment: number | null,
  daysUntilExpiry: number | null,
  lastAttendanceDate: Date | null,
) {
  await prisma.churnPrediction.upsert({
    where: { gymId_memberId: { gymId, memberId } },
    create: {
      gymId,
      memberId,
      score: scored.churnRisk,
      riskLevel: churnRiskLevel(scored.churnRisk),
      attendanceLast30Days,
      paymentDelayDays: daysSinceLastPayment,
      daysUntilExpiry,
      lastAttendanceDate,
      calculatedAt: new Date(),
    },
    update: {
      score: scored.churnRisk,
      riskLevel: churnRiskLevel(scored.churnRisk),
      attendanceLast30Days,
      paymentDelayDays: daysSinceLastPayment,
      daysUntilExpiry,
      lastAttendanceDate,
      calculatedAt: new Date(),
    },
  });
}

export type RefreshMemberOptions = {
  useLlm?: boolean;
  /** Skip re-fetch when batch pass already built input + rules score. */
  input?: MemberOpportunityInput;
  scored?: OpportunityScoreResult;
  /** Precomputed from parallel LLM batch. */
  llmResult?: LlmReadinessResult;
};

/** Single pass: features → rules (+ optional LLM) → churn row → optional open opportunity. */
export async function refreshMemberReadiness(
  gymId: string,
  memberId: string,
  calibration: GymReadinessCalibration,
  options?: RefreshMemberOptions,
) {
  const input =
    options?.input ?? (await buildMemberOpportunityInput(gymId, memberId));
  if (!input) return null;

  let scored = options?.scored ?? scoreOpportunity(input, calibration);
  let inferenceSource: InferenceSource = scored.inferenceSource ?? "RULES";
  let llmAssessment: Record<string, unknown> | null = null;

  if (options?.useLlm) {
    const llm =
      options.llmResult ??
      (await assessMemberReadinessWithLlm(input, scored, calibration));
    if (llm.applied && llm.merged) {
      scored = { ...scored, ...llm.merged, inferenceSource: llm.inferenceSource };
      inferenceSource = llm.inferenceSource;
      llmAssessment = llm.assessment
        ? (llm.assessment as unknown as Record<string, unknown>)
        : null;
    }
  }

  const member = await prisma.member.findFirst({
    where: { id: memberId, gymId },
    include: {
      Membership: { orderBy: { endDate: "desc" }, take: 1 },
      Attendance: { orderBy: { checkIn: "desc" }, take: 1, select: { checkIn: true } },
    },
  });
  if (!member) return null;

  const latestMembership = member.Membership[0];
  const daysUntilExpiry = latestMembership
    ? -daysFromTodayIST(toDateOnlyIST(latestMembership.endDate))
    : null;

  await upsertChurnRow(
    gymId,
    memberId,
    scored,
    input.attendanceLast30Days,
    input.daysSinceLastPayment,
    daysUntilExpiry,
    member.Attendance[0]?.checkIn ?? null,
  );

  const shouldTrackOpportunity =
    scored.score >= 20 ||
    (scored.churnRisk >= 65 && input.daysToExpiry <= 30) ||
    (scored.readinessScore >= 58 && input.daysToExpiry <= 14);

  if (!shouldTrackOpportunity) {
    return { scored, opportunity: null };
  }

  const opportunity = await upsertOpenOpportunity(gymId, memberId, {
    score: scored.score,
    amountAtRisk: scored.amountAtRisk,
    priority: scored.priority,
    reasons: scored.reasons,
    payProbability: scored.readinessScore,
    churnRisk: scored.churnRisk,
    predictionLabel: scored.predictionLabel,
    readinessModelVersion: scored.readinessModelVersion,
    featureSnapshot: featureSnapshotFromInput(input),
    inferenceSource,
    llmAssessment,
  });

  return { scored, opportunity };
}
