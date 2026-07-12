import { inngest } from "./client";
import { refreshGymFactsForAllGyms } from "@/domains/intelligence/gym-facts";

export const refreshDailyGymFacts = inngest.createFunction(
  { id: "refresh-daily-gym-facts", concurrency: { limit: 1 } },
  { cron: "30 2 * * *" },
  async ({ step }) => {
    return step.run("refresh-facts", () => refreshGymFactsForAllGyms());
  },
);
