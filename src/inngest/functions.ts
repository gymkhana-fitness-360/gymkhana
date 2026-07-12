import { inngest } from "./client";
import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";
import { ErrorMonitor } from "@/lib/error-monitor";
import { createLogger } from "@/lib/logger";

const logger = createLogger("app");

/**
 * Background job: Send renewal reminders
 * Runs daily to check for upcoming renewals
 */
export const sendRenewalReminders = inngest.createFunction(
  { id: "send-renewal-reminders", concurrency: { limit: 1 } },
  { cron: "0 9 * * *" }, // Run at 9 AM daily
  async ({ step }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const expiringMemberships = await step.run("find-expiring", async () => {
      return prisma.membership.findMany({
        where: {
          endDate: {
            gte: today,
            lte: threeDaysFromNow,
          },
          Member: {
            status: "ACTIVE",
          },
        },
        include: {
          Member: true,
          Plan: true,
        },
      });
    });

    const reminders = await step.run("create-reminders", async () => {
      const created = [];
      for (const membership of expiringMemberships) {
        const reminder = await prisma.reminder.create({
          data: {
            memberId: membership.memberId,
            gymId: membership.gymId,
            type: "RENEWAL_DUE",
            message: `Hi ${membership.Member.name}, your ${membership.Plan.name} membership expires on ${new Date(membership.endDate).toLocaleDateString()}. Please renew to continue.`,
            scheduledFor: today,
            status: "SCHEDULED",
          },
        });
        created.push(reminder);
      }
      return created;
    });

    return { reminderCount: reminders.length };
  }
);

/**
 * Background job: Monitor and report errors
 * Runs every hour to check error stats
 */
export const monitorErrors = inngest.createFunction(
  { id: "monitor-errors", concurrency: { limit: 1 } },
  { cron: "0 * * * *" }, // Run every hour
  async ({ step }) => {
    const stats = await step.run("get-error-stats", async () => {
      return ErrorMonitor.getInstance().getStats();
    });

    await step.run("log-stats", async () => {
      logger.info("📊 [Error Monitor] Hourly Report:", {
        total: stats.total,
        fixed: stats.fixed,
        unfixed: stats.unfixed,
        fixRate: stats.fixRate,
      });
    });

    // Alert if too many unfixed errors
    if (stats.unfixed > 10) {
      await step.run("alert-high-errors", async () => {
        logger.error(`🚨 [Alert] High unfixed error count: ${stats.unfixed}`);
        // TODO: Send alert via email/Slack/etc
      });
    }

    return stats;
  }
);
