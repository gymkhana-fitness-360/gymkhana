# Playbook: Cron & background jobs

## When to use

- Nightly maintenance, stats refresh, admin task sync, reports
- Async work that must survive serverless timeouts → Inngest

## Thin cron route template

```typescript
import { verifyCronRequest } from "@/lib/cron-auth";
import { startJob, completeJob, failJob } from "@/lib/cron/job-tracker";

export async function GET(request: NextRequest) {
  if (!verifyCronRequest(request)) return ApiErrors.unauthorized();

  const start = await startJob("my-job-name");
  if (!start.ok || !start.executionId) {
    return NextResponse.json({ error: "Job already running" }, { status: 409 });
  }

  try {
    const result = await myDomainFunction(); // all business logic here
    await completeJob(start.executionId, result);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    await failJob(start.executionId, String(error));
    return ApiErrors.internal("Job failed");
  }
}
```

## Multi-tenant refresh

```typescript
import { refreshAllGymDailyStats } from "@/domains/analytics/daily-stats.service";
import { syncAllAdminTasks } from "@/domains/admin-tasks/service";

const gyms = await prisma.gym.findMany({ select: { id: true } });
for (const { id: gymId } of gyms) {
  await syncAllAdminTasks(gymId);
}
await refreshAllGymDailyStats();
```

Prefer bundling into `/api/cron/unified` when Vercel cron slot count is limited.

## Inngest

1. Create function in `src/inngest/<name>-functions.ts`
2. Register in `src/app/api/inngest/route.ts`
3. Use `step.run()` for retries; pass `gymId` in event payload for tenant work
4. Log failures via `recordErrorLog({ source: "INNGEST", ... })`

## Existing jobs (extend, don't fork)

| Job | Route / function |
|-----|------------------|
| Unified daily | `/api/cron/unified` |
| Daily stats | `/api/cron/refresh-daily-stats` |
| Lifecycle maintenance | `inngest/lifecycle-cron-functions.ts` |
| DB backup stub | `/api/cron/db-backup` |
| Overdue report | `/api/cron/daily-overdue-report` |

## Checklist

- [ ] `CRON_SECRET` verified
- [ ] Idempotent
- [ ] `gymId` per tenant
- [ ] Job tracker used for long jobs
- [ ] Errors to `ErrorLog` on failure paths
