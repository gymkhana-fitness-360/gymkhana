/**
 * Unified Vercel cron task registry.
 * Schedule: vercel.json → /api/cron/unified at 00:00 UTC (midnight IST).
 */
import { MemberStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { todayIST } from "@/lib/date-only";
import { updateAllExpiredMemberStatuses } from "@/lib/services/status-updater.service";
import { runCloudDatabaseBackup } from "@/lib/services/db-backup-cloud.service";
import { refreshAllGymOperatingHoursFacts } from "@/domains/analytics/operating-hours-fact";
import { syncAllAdminTasks } from "@/domains/admin-tasks/service";
import { refreshAllGymDailyStats } from "@/domains/analytics/daily-stats.service";
import { markStaleOverdueInactive } from "@/domains/collections/handlers/mark-stale-overdue-inactive";
import { runDailyOverdueReport } from "@/domains/collections/handlers/daily-overdue-report";

export type CronJobResult = {
  task: string;
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  duration: number;
};

async function runTask(
  task: string,
  fn: () => Promise<Record<string, unknown>>,
): Promise<CronJobResult> {
  const start = Date.now();
  try {
    const data = await fn();
    return { task, success: true, data, duration: Date.now() - start };
  } catch (error) {
    return {
      task,
      success: false,
      error: String(error),
      duration: Date.now() - start,
    };
  }
}

export async function runUpdateMembershipStatusTask(): Promise<CronJobResult> {
  return runTask("update-membership-status", async () => {
    const membersUpdated = await updateAllExpiredMemberStatuses();
    return { membersUpdated };
  });
}

/** Resolve overdue tracking rows older than 30 days where member is EXPIRED. */
export async function runResolveExpiredOverdueTask(): Promise<CronJobResult> {
  return runTask("resolve-expired-overdue", async () => {
    const today = todayIST();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const resolved = await prisma.overdueTracking.updateMany({
      where: {
        resolvedAt: null,
        detectedAt: { lt: thirtyDaysAgo },
        Member: { status: MemberStatus.EXPIRED },
      },
      data: { resolvedAt: today },
    });

    return { recordsResolved: resolved.count };
  });
}

/** Mark overdue rows inactive after 7 days without attendance. */
export async function runMarkStaleOverdueInactiveTask(): Promise<CronJobResult> {
  return runTask("mark-stale-overdue-inactive", async () => {
    const result = await markStaleOverdueInactive();
    return { markedInactive: result.markedInactive };
  });
}

export async function runOperatingHoursFactsTask(): Promise<CronJobResult> {
  return runTask("operating-hours-facts", async () => {
    const refreshed = await refreshAllGymOperatingHoursFacts();
    return { gyms: refreshed.length, ok: refreshed.filter((r) => r.ok).length };
  });
}

export async function runAdminTasksAndDailyStatsTask(): Promise<CronJobResult> {
  return runTask("admin-tasks-daily-stats", async () => {
    const gyms = await prisma.gym.findMany({ select: { id: true } });
    let tasksUpserted = 0;
    for (const gym of gyms) {
      const sync = await syncAllAdminTasks(gym.id);
      tasksUpserted += sync.renewal.upserted;
    }
    const stats = await refreshAllGymDailyStats();
    return {
      gyms: gyms.length,
      tasksUpserted,
      statsOk: stats.filter((s) => s.ok).length,
    };
  });
}

export async function runDailyOverdueReportTask(): Promise<CronJobResult> {
  return runTask("daily-overdue-report", async () => {
    const result = await runDailyOverdueReport();
    return { gyms: result.gyms, reportCount: result.reports.length };
  });
}

export async function runCloudDbBackupTask(): Promise<CronJobResult> {
  return runTask("db-backup", async () => {
    const result = await runCloudDatabaseBackup();
    return { stub: result.stub, sizeBytes: result.sizeBytes };
  });
}

/** All tasks run by /api/cron/unified in order. */
export const UNIFIED_CRON_TASKS = [
  runUpdateMembershipStatusTask,
  runResolveExpiredOverdueTask,
  runMarkStaleOverdueInactiveTask,
  runOperatingHoursFactsTask,
  runAdminTasksAndDailyStatsTask,
  runDailyOverdueReportTask,
  runCloudDbBackupTask,
] as const;
