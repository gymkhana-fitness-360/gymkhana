import type { GymReadinessCalibration } from "@/domains/revenue-opportunities/calibration";
import type {
  MemberOpportunityInput,
  OpportunityScoreResult,
  PredictionLabel,
} from "@/domains/revenue-opportunities/types";
import type { LlmReadinessAssessment, LlmReadinessResult } from "./member-readiness-llm";

export const DEV_MOCK_MODEL_TAG = "dev-mock-readiness-v1";

/** Local demo when no API key — clearly labeled, grounded in rules signals. */
export function buildDevMockReadinessAssessment(
  input: MemberOpportunityInput,
  rules: OpportunityScoreResult,
  calibration: GymReadinessCalibration,
): LlmReadinessResult {
  const label = rules.predictionLabel;
  const recommendedAction =
    input.daysToExpiry < 0 && input.attendanceLast30Days === 0
      ? "phone_call"
      : input.daysToExpiry <= 7
        ? "send_whatsapp_reminder"
        : input.remindersLast30Days >= 3
          ? "wait"
          : "send_whatsapp_reminder";

  const rationale =
    label === "LIKELY_TO_PAY"
      ? `${input.memberName}: strong engagement signals; prioritize reminder while membership is still recoverable.`
      : label === "UNLIKELY"
        ? `${input.memberName}: weak payment/attendance pattern; consider phone follow-up before writing off.`
        : `${input.memberName}: mixed signals — contact with a clear renewal ask this week.`;

  const assessment: LlmReadinessAssessment = {
    predictionLabel: label,
    readinessScore: rules.readinessScore,
    churnRisk: rules.churnRisk,
    rationale,
    recommendedAction,
    keySignals: rules.reasons.slice(0, 3),
    model: DEV_MOCK_MODEL_TAG,
    assessedAt: new Date().toISOString(),
  };

  return {
    applied: true,
    assessment,
    inferenceSource: "LLM",
    merged: {
      readinessScore: rules.readinessScore,
      payProbability: rules.readinessScore,
      churnRisk: rules.churnRisk,
      predictionLabel: label as PredictionLabel,
      outcomeSummary: `${rationale} [Dev mock — set FITNESS360_AI_API_KEY for live LLM]`,
      readinessModelVersion: `${rules.readinessModelVersion}+${DEV_MOCK_MODEL_TAG}`,
    },
  };
}
