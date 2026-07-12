/**
 * JobTracker - Mutex semantics for background jobs (TLA+ verified pattern)
 * Prevents simultaneous execution of the same job type.
 * Used with Inngest concurrency: { limit: 1 } for each cron function.
 */

export const JOB_IDS = [
  "check-dormant-members",
  "send-renewal-reminders",
  "monitor-errors",
] as const;

export type JobId = (typeof JOB_IDS)[number];

/**
 * Valid job states (matches TLA+ JobScheduler spec)
 */
export type JobState = "IDLE" | "RUNNING" | "COMPLETED" | "FAILED";

/**
 * In-memory job state for monitoring (Inngest handles actual mutex via concurrency)
 */
const jobState = new Map<JobId, { state: JobState; lastRun?: Date }>();

export function getJobState(id: JobId): JobState {
  return jobState.get(id)?.state ?? "IDLE";
}

export function setJobState(id: JobId, state: JobState): void {
  jobState.set(id, {
    state,
    lastRun: state === "RUNNING" ? new Date() : jobState.get(id)?.lastRun,
  });
}
