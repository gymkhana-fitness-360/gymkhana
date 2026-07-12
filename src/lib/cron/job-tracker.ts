/**
 * Job tracker - persist cron execution state to DB
 * Prevents overlapping runs, tracks status and duration.
 */

import type { Prisma } from "@prisma/client";
import { JobExecutionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type JobStatus = "RUNNING" | "COMPLETED" | "FAILED";

export async function startJob(jobName: string): Promise<{ ok: boolean; executionId?: string; error?: string }> {
  const running = await prisma.jobExecution.findFirst({
    where: { jobName, status: JobExecutionStatus.RUNNING },
  });
  if (running) {
    return { ok: false, error: "Job already running" };
  }
  const exec = await prisma.jobExecution.create({
    data: { jobName, status: JobExecutionStatus.RUNNING },
  });
  return { ok: true, executionId: exec.id };
}

export async function completeJob(
  executionId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await prisma.jobExecution.update({
    where: { id: executionId },
    data: {
      status: JobExecutionStatus.COMPLETED,
      completedAt: new Date(),
      metadata: metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function failJob(executionId: string, error: string): Promise<void> {
  await prisma.jobExecution.update({
    where: { id: executionId },
    data: {
      status: JobExecutionStatus.FAILED,
      completedAt: new Date(),
      error,
    },
  });
}

export async function withJobTracking<T>(
  jobName: string,
  fn: () => Promise<T>
): Promise<{ ok: boolean; result?: T; error?: string }> {
  const { ok, executionId } = await startJob(jobName);
  if (!ok || !executionId) {
    return { ok: false, error: "Job already running" };
  }
  try {
    const result = await fn();
    await completeJob(executionId, { result: "success" });
    return { ok: true, result };
  } catch (e) {
    await failJob(executionId, String(e));
    throw e;
  }
}
