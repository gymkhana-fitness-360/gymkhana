import { prisma } from "@/lib/prisma";
import { mapChunked } from "@/lib/async-batch";
import { assessMembersWithLlmBatch } from "@/lib/inference/batch-readiness-llm";
import { generateCohortBriefWithLlm } from "@/lib/inference/cohort-brief-llm";
import {
  getInferenceConfig,
  isCohortBriefInferenceEnabled,
  isInferenceEnabled,
  resolveMaxLlmMembersPerRun,
} from "@/lib/inference/provider";
import {
  calibrateGymReadiness,
  loadGymReadinessCalibration,
} from "./calibration";
import { buildMemberOpportunityInput } from "./member-input";
import { refreshMemberReadiness } from "./refresh-member";
import { scoreOpportunity } from "./scoring";
import { getChasePlan } from "./chase-plan";

export { buildMemberOpportunityInput } from "./member-input";

export async function generateOpportunityForMember(gymId: string, memberId: string) {
  const calibration = await loadGymReadinessCalibration(gymId);
  const result = await refreshMemberReadiness(gymId, memberId, calibration, {
    useLlm: isInferenceEnabled(),
  });
  return result?.opportunity ?? null;
}

export type GenerateOpportunitiesOptions = {
  /** When false, batch uses rules/calibration only (no Groq/Anthropic). */
  allowLlm?: boolean;
};

export async function generateOpportunitiesForGym(
  gymId: string,
  options?: GenerateOpportunitiesOptions,
) {
  const calibration = await calibrateGymReadiness(gymId);
  const inference = getInferenceConfig();
  const allowLlm = options?.allowLlm !== false && inference.enabled;
  const maxLlmMembers = resolveMaxLlmMembersPerRun();

  const members = await prisma.member.findMany({
    where: {
      gymId,
      status: { in: ["ACTIVE", "EXPIRED"] },
    },
    select: { id: true },
  });

  type Pending = {
    id: string;
    input: NonNullable<Awaited<ReturnType<typeof buildMemberOpportunityInput>>>;
    scored: ReturnType<typeof scoreOpportunity>;
  };

  const built = await mapChunked(members, 10, async ({ id }) => {
    const input = await buildMemberOpportunityInput(gymId, id);
    if (!input) return null;
    return { id, input, scored: scoreOpportunity(input, calibration) };
  });
  const pending: Pending[] = built.filter((p): p is Pending => p !== null);

  pending.sort((a, b) => b.scored.readinessScore - a.scored.readinessScore);

  const openOppMemberIds = new Set(
    (
      await prisma.opportunity.findMany({
        where: { gymId, status: "OPEN" },
        select: { memberId: true },
        take: 50,
      })
    ).map((o) => o.memberId),
  );

  const llmCandidateIds = new Set<string>();
  if (allowLlm && maxLlmMembers > 0) {
    for (const row of pending) {
      if (llmCandidateIds.size >= maxLlmMembers) break;
      if (openOppMemberIds.has(row.id) || row.scored.readinessScore >= 50) {
        llmCandidateIds.add(row.id);
      }
    }
    for (const row of pending) {
      if (llmCandidateIds.size >= maxLlmMembers) break;
      llmCandidateIds.add(row.id);
    }
  }

  const llmBatchRows = pending
    .filter((p) => llmCandidateIds.has(p.id))
    .map((p) => ({
      memberId: p.id,
      input: p.input,
      scored: p.scored,
    }));

  const llmResults =
    allowLlm && llmBatchRows.length > 0
      ? await assessMembersWithLlmBatch(llmBatchRows, calibration)
      : new Map();

  let opportunities = 0;
  let churnRows = 0;
  let llmAssessed = 0;
  let llmFailed = 0;

  for (const row of pending) {
    const useLlm = llmCandidateIds.has(row.id);
    const result = await refreshMemberReadiness(gymId, row.id, calibration, {
      useLlm,
      input: row.input,
      scored: row.scored,
      llmResult: useLlm ? llmResults.get(row.id) : undefined,
    });
    if (result) churnRows++;
    if (result?.opportunity) opportunities++;
    if (result?.scored.inferenceSource === "LLM") llmAssessed++;
    if (useLlm && result?.scored.inferenceSource === "RULES") llmFailed++;
  }

  let cohortBrief = null;
  if (
    allowLlm &&
    !inference.isDevMock &&
    isCohortBriefInferenceEnabled()
  ) {
    const plan = await getChasePlan(gymId, 15);
    cohortBrief = await generateCohortBriefWithLlm(
      gymId,
      plan.steps,
      calibration,
    );
  }

  return {
    gymId,
    processed: members.length,
    opportunities,
    churnRows,
    llmAssessed,
    llmFailed,
    llmEnabled: inference.enabled,
    inferenceProvider: inference.provider,
    inferenceModel: inference.model,
    inferenceHint: inference.hint,
    isDevMock: inference.isDevMock,
    calibration: {
      sampleSize: calibration.sampleSize,
      recoveryRate: calibration.recoveryRate,
      modelVersion: calibration.modelVersion,
    },
    cohortBrief,
  };
}

export async function generateOpportunitiesForAllGyms(
  options?: GenerateOpportunitiesOptions,
) {
  const gyms = await prisma.gym.findMany({ select: { id: true } });
  const results = [];
  for (const gym of gyms) {
    results.push(await generateOpportunitiesForGym(gym.id, options));
  }
  return results;
}
