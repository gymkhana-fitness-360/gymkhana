import { generateObject } from "ai";
import { z } from "zod";
import { upsertGymFact } from "@/domains/intelligence/gym-facts";
import type { ChasePlanStep } from "@/domains/revenue-opportunities/chase-plan";
import type { GymReadinessCalibration } from "@/domains/revenue-opportunities/calibration";
import { getInferenceModel, isInferenceEnabled } from "./provider";

const briefSchema = z.object({
  headline: z.string().max(160),
  focusToday: z.array(z.string().max(120)).max(5),
  avoidWastingTimeOn: z.string().max(200),
});

export async function generateCohortBriefWithLlm(
  gymId: string,
  steps: ChasePlanStep[],
  calibration: GymReadinessCalibration,
): Promise<z.infer<typeof briefSchema> | null> {
  if (!isInferenceEnabled() || steps.length === 0) return null;

  try {
    const { object } = await generateObject({
      model: getInferenceModel(),
      schema: briefSchema,
      system:
        "You write a 1-day recovery brief for a gym owner in India. Use only the member list provided. No generic fitness advice.",
      prompt: JSON.stringify({
        calibration,
        members: steps.slice(0, 12).map((s) => ({
          name: s.memberName,
          readiness: s.readinessScore,
          churnRisk: s.churnRisk,
          label: s.predictionLabel,
          amountAtRisk: s.amountAtRisk,
          topReason: s.reasons[0],
          llmRationale: s.llmRationale,
        })),
      }),
      temperature: 0.3,
    });

    await upsertGymFact(gymId, "readiness.cohort_brief_llm", {
      factType: "INSIGHT",
      value: { ...object, generatedAt: new Date().toISOString() },
      source: "llm",
    });

    return object;
  } catch (err) {
    console.warn("[inference] cohort brief failed", {
      gymId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
