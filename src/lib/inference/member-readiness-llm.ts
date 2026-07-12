import { generateObject } from "ai";
import { z } from "zod";
import type { GymReadinessCalibration } from "@/domains/revenue-opportunities/calibration";
import type {
  MemberOpportunityInput,
  OpportunityScoreResult,
  PredictionLabel,
} from "@/domains/revenue-opportunities/types";
import { buildDevMockReadinessAssessment } from "./dev-mock-readiness";
import {
  getInferenceConfig,
  getInferenceModel,
  isDevMockInferenceEnabled,
  isInferenceEnabled,
} from "./provider";

export const LLM_READINESS_MODEL_TAG = "llm-readiness-v1";

const assessmentSchema = z.object({
  predictionLabel: z.enum(["LIKELY_TO_PAY", "AT_RISK", "UNLIKELY"]),
  readinessScore: z.number().int().min(0).max(100),
  churnRisk: z.number().int().min(0).max(100),
  rationale: z.string().max(320),
  recommendedAction: z.enum([
    "send_whatsapp_reminder",
    "phone_call",
    "wait",
    "in_person_visit",
  ]),
  keySignals: z.array(z.string().max(120)).max(4),
});

export type LlmReadinessAssessment = z.infer<typeof assessmentSchema> & {
  model: string;
  assessedAt: string;
  error?: string;
};

const SYSTEM = `You are Fitness360's recovery readiness engine for Indian gym operators.
You receive factual member signals and a rules baseline. Output structured assessment only.
Rules:
- Never invent payments, visits, or messages not in the payload.
- readinessScore = staff effort likely converts to payment/renewal (0-100 index, not a statistical probability).
- churnRisk = lapse risk (0-100).
- rationale: max 2 sentences, cite concrete signals from the payload.
- recommendedAction must match urgency.`;

function buildPrompt(
  input: MemberOpportunityInput,
  rules: OpportunityScoreResult,
  calibration: GymReadinessCalibration,
): string {
  return JSON.stringify(
    {
      member: {
        name: input.memberName,
        daysToExpiry: input.daysToExpiry,
        overdueAmountInr: input.overdueAmount,
        membershipValueInr: input.membershipValue,
        attendanceLast30Days: input.attendanceLast30Days,
        paymentsLast90Days: input.paymentsLast90Days,
        remindersLast30Days: input.remindersLast30Days,
        daysSinceLastPayment: input.daysSinceLastPayment,
      },
      rulesBaseline: {
        urgencyScore: rules.score,
        priority: rules.priority,
        readinessScore: rules.readinessScore,
        churnRisk: rules.churnRisk,
        predictionLabel: rules.predictionLabel,
        reasons: rules.reasons,
      },
      gymCalibration: {
        sampleSize: calibration.sampleSize,
        recoveryRate: calibration.recoveryRate,
        paymentWithin7dRate: calibration.paymentWithin7dRate,
      },
    },
    null,
    2,
  );
}

/** Keep LLM scores but prevent wild hallucination vs rules. */
function guardrailScore(rules: number, llm: number, maxDelta = 22): number {
  const delta = llm - rules;
  if (Math.abs(delta) <= maxDelta) return llm;
  return Math.round(rules + Math.sign(delta) * maxDelta);
}

export type LlmReadinessResult = {
  applied: boolean;
  assessment?: LlmReadinessAssessment;
  merged?: Pick<
    OpportunityScoreResult,
    | "readinessScore"
    | "payProbability"
    | "churnRisk"
    | "predictionLabel"
    | "outcomeSummary"
    | "readinessModelVersion"
  >;
  inferenceSource: "RULES" | "LLM" | "HYBRID";
};

export async function assessMemberReadinessWithLlm(
  input: MemberOpportunityInput,
  rules: OpportunityScoreResult,
  calibration: GymReadinessCalibration,
): Promise<LlmReadinessResult> {
  if (!isInferenceEnabled()) {
    return { applied: false, inferenceSource: "RULES" };
  }

  if (isDevMockInferenceEnabled()) {
    return buildDevMockReadinessAssessment(input, rules, calibration);
  }

  try {
    const { object, response } = await generateObject({
      model: getInferenceModel(),
      schema: assessmentSchema,
      system: SYSTEM,
      prompt: buildPrompt(input, rules, calibration),
      temperature: 0.2,
    });

    const modelId = response?.modelId ?? LLM_READINESS_MODEL_TAG;
    const assessment: LlmReadinessAssessment = {
      ...object,
      model: modelId,
      assessedAt: new Date().toISOString(),
    };

    const readinessScore = guardrailScore(
      rules.readinessScore,
      object.readinessScore,
    );
    const churnRisk = guardrailScore(rules.churnRisk, object.churnRisk, 18);
    const predictionLabel = object.predictionLabel as PredictionLabel;

    return {
      applied: true,
      assessment,
      inferenceSource: "LLM",
      merged: {
        readinessScore,
        payProbability: readinessScore,
        churnRisk,
        predictionLabel,
        outcomeSummary: object.rationale,
        readinessModelVersion: `${rules.readinessModelVersion}+${LLM_READINESS_MODEL_TAG}`,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[inference] LLM readiness failed; using rules", {
      memberId: input.memberId,
      error: message,
    });
    return {
      applied: false,
      inferenceSource: "RULES",
      assessment: {
        predictionLabel: rules.predictionLabel,
        readinessScore: rules.readinessScore,
        churnRisk: rules.churnRisk,
        rationale: rules.outcomeSummary,
        recommendedAction: "send_whatsapp_reminder",
        keySignals: rules.reasons.slice(0, 2),
        model: "error-fallback",
        assessedAt: new Date().toISOString(),
        error: message,
      },
    };
  }
}
