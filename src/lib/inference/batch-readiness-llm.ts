import type { GymReadinessCalibration } from "@/domains/revenue-opportunities/calibration";
import type {
  MemberOpportunityInput,
  OpportunityScoreResult,
} from "@/domains/revenue-opportunities/types";
import {
  assessMemberReadinessWithLlm,
  type LlmReadinessResult,
} from "./member-readiness-llm";

const DEFAULT_CONCURRENCY = 5;

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]!);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

export type BatchLlmRow = {
  memberId: string;
  input: MemberOpportunityInput;
  scored: OpportunityScoreResult;
};

/** Run member LLM assessments in parallel (bounded concurrency). */
export async function assessMembersWithLlmBatch(
  rows: BatchLlmRow[],
  calibration: GymReadinessCalibration,
  options?: { concurrency?: number },
): Promise<Map<string, LlmReadinessResult>> {
  const concurrency = options?.concurrency ?? DEFAULT_CONCURRENCY;
  const out = new Map<string, LlmReadinessResult>();

  if (rows.length === 0) return out;

  const results = await mapPool(rows, concurrency, (row) =>
    assessMemberReadinessWithLlm(row.input, row.scored, calibration).then(
      (result) => ({ memberId: row.memberId, result }),
    ),
  );

  for (const { memberId, result } of results) {
    out.set(memberId, result);
  }
  return out;
}
