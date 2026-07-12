# Playbook: Admin maintenance API (dry-run fixes)

## When to use

One-time or recurring **data integrity fixes** (backdate memberships, clear stale overdue rows, stack cleanup preview).

## Route contract

```
POST /api/admin/<action>
Auth: ADMIN + requireApiGymId
Body: { dryRun?: boolean; ...dateRange }
Response: { dryRun, fixed, candidates[], message }
```

## Rules

1. **Idempotent** — safe to run twice; second run fixes 0 rows
2. **Dry-run first** — UI defaults to preview; explicit button for execute
3. **gymId** on every query — never global scan in multi-tenant prod
4. **Rate limit** `strict` on POST
5. Prefer **domain handler** when logic exceeds ~80 lines

## Examples in repo

| API | Purpose |
|-----|---------|
| `admin/backdate-late-payments` | Close 8–15 day gaps between membership periods |
| `admin/fix-stale-overdue` | Clear overdue rows after payment received |
| `payments/future-membership-stack-cleanup` | Preview/apply stacked future memberships |
| `payments/sync-memberships` | Reconcile `nextRenewalDate` from latest payment linkage |

## UI placement

- Settings → advanced/admin section, or dedicated `/dashboard/payments/...` admin page
- Show candidate table on dry-run; require confirm on execute

## Not for

- User-facing CRUD (use domain handlers + `crud-business-validation`)
- Reminder approve→send queue (separate product decision)
