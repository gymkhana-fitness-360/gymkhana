import { NextRequest, NextResponse } from "next/server";
import { startJob, completeJob, failJob } from "@/lib/cron/job-tracker";
import { createLogger } from "@/lib/logger";
import { ApiErrors } from "@/lib/api-handler";
import { UNIFIED_CRON_TASKS, type CronJobResult } from "@/domains/platform/cron-tasks";

const logger = createLogger("cron-unified");
const JOB_NAME = "unified-daily-maintenance";

export async function runUnifiedCronMaintenance(): Promise<NextResponse> {
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
