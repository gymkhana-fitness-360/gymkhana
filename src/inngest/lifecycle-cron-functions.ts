import { inngest } from "./client";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import { syncAllAdminTasks } from "@/domains/admin-tasks/service";
import { refreshAllGymDailyStats } from "@/domains/analytics/daily-stats.service";

const logger = createLogger("inngest-lifecycle-cron");

/**
 * Tenant-aware lifecycle maintenance — admin task sync + daily stats cache.
 * Reminder approve→send queue (A1) intentionally excluded from opensource import.
 */
export const runLifecycleMaintenanceCron = inngest.createFunction(
  { id: "run-lifecycle-maintenance-cron", retries: 2 },
  [{ cron: "30 0 * * *" }, { event: "cron/lifecycle-maintenance.run" }],
  async ({ step }) => {
    const gyms = await step.run("load-gyms", async () =>
      prisma.gym.findMany({ select: { id: true, name: true } }),
    );

    let tasksSynced = 0;
    let statsRefreshed = 0;

    for (const gym of gyms) {
      await step.run(`sync-admin-tasks-${gym.id}`, async () => {
        const result = await syncAllAdminTasks(gym.id);
        tasksSynced += result.renewal.upserted;
        return result;
      });
    }

    await step.run("refresh-daily-stats", async () => {
      const results = await refreshAllGymDailyStats();
      statsRefreshed = results.filter((r) => r.ok).length;
      return results;
    });

    logger.info("lifecycle maintenance complete", { gyms: gyms.length, tasksSynced, statsRefreshed });
    return { gyms: gyms.length, tasksSynced, statsRefreshed };
  },
);
