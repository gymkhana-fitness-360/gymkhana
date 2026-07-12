/**
 * Unified Cron — single Vercel-scheduled maintenance path.
 *
 * Schedule: midnight daily (00:00 UTC ≈ 05:30 IST) — see vercel.json
 * Auth: `CRON_SECRET` + `Authorization: Bearer <CRON_SECRET>`
 *
 * Tasks (in order):
 * 1. update-membership-status — mark expired members EXPIRED
 * 2. resolve-expired-overdue — resolve 30d+ overdue rows for EXPIRED members
 * 3. mark-stale-overdue-inactive — 7d no-attendance → markedInactiveAt
 * 4. operating-hours-facts — peak/quiet analytics per gym
 * 5. admin-tasks-daily-stats — sync admin inbox + materialized daily stats
 * 6. daily-overdue-report — WA admin digest when Meta WABA configured
 * 7. db-backup — cloud backup stub when BLOB_READ_WRITE_TOKEN set
 *
 * Legacy standalone /api/cron/* routes return 410 Gone.
 */

import { NextRequest, NextResponse } from "next/server";
import { startJob, completeJob, failJob } from "@/lib/cron/job-tracker";
import { createLogger } from "@/lib/logger";
import { ApiErrors } from "@/lib/api-handler";
import { verifyCronRequest } from "@/lib/cron-auth";
import { UNIFIED_CRON_TASKS, type CronJobResult } from "@/domains/platform/cron-tasks";

const logger = createLogger("cron-unified");
const JOB_NAME = "unified-daily-maintenance";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    logger.warn("Unauthorized cron attempt");
    return ApiErrors.unauthorized();
  }

  const start = await startJob(JOB_NAME);
  if (!start.ok || !start.executionId) {
    logger.warn("Job already running or failed to start", { error: start.error });
    return NextResponse.json({ error: start.error ?? "Job already running" }, { status: 409 });
  }
  const executionId = start.executionId;

  const results: CronJobResult[] = [];
  const overallStart = Date.now();

  try {
    logger.info("Starting unified daily maintenance");

    for (const runTask of UNIFIED_CRON_TASKS) {
      const result = await runTask();
      results.push(result);
      if (result.success) {
        logger.info(`Task ${result.task} completed`, result.data);
      } else {
        logger.error(`Task ${result.task} failed`, new Error(result.error ?? "unknown"));
      }
    }

    const overallDuration = Date.now() - overallStart;
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    await completeJob(executionId, {
      results,
      summary: {
        totalTasks: results.length,
        successful: successCount,
        failed: failureCount,
        duration: overallDuration,
      },
    });

    logger.info("Unified daily maintenance completed", {
      successful: successCount,
      failed: failureCount,
      duration: overallDuration,
    });

    return NextResponse.json({
      success: true,
      results,
      summary: {
        totalTasks: results.length,
        successful: successCount,
        failed: failureCount,
        duration: overallDuration,
      },
    });
  } catch (error) {
    await failJob(executionId, String(error));
    logger.error("Unified daily maintenance failed", error as Error);
    return ApiErrors.internal("Failed to complete daily maintenance");
  }
}
