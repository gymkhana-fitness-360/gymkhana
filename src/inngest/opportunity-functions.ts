import { inngest } from "./client";
import { generateOpportunitiesForAllGyms } from "@/domains/revenue-opportunities";
import { isCronLlmInferenceEnabled } from "@/lib/inference/provider";

/**
 * Nightly revenue opportunity generation — idempotent upsert of OPEN opportunities.
 * Runs at 02:00 AM IST-equivalent (cron uses UTC: 20:30 UTC ≈ 02:00 IST).
 */
export const generateDailyOpportunities = inngest.createFunction(
  { id: "generate-daily-opportunities", concurrency: { limit: 1 } },
  { cron: "0 2 * * *" },
  async ({ step }) => {
    const allowLlm = isCronLlmInferenceEnabled();
    const results = await step.run("generate-opportunities", async () => {
      return generateOpportunitiesForAllGyms({ allowLlm });
    });

    const totals = results.reduce(
      (acc, row) => ({
        gyms: acc.gyms + 1,
        processed: acc.processed + row.processed,
        opportunities: acc.opportunities + row.opportunities,
      }),
      { gyms: 0, processed: 0, opportunities: 0 },
    );

    return totals;
  },
);
