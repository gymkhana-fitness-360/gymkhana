# Playbook: Attendance page bootstrap

## When to use

Attendance dashboard needs **fast first paint** — split critical vs secondary payloads.

## API

```
GET /api/attendance/bootstrap?date=YYYY-MM-DD&scope=full|critical|records
GET /api/attendance/bootstrap/secondary?date=...  — records + call list
GET /api/attendance/call-list
POST /api/admin/attendance/reassign-date  — admin only
```

## Domain services

| Service | Path |
|---------|------|
| Bootstrap | `domains/attendance/services/bootstrap.ts` |
| Call list | `domains/analytics/daily-stats.service.ts` → `getAttendanceCallList` |
| Reassign | `domains/attendance/services/reassign-date.ts` |

## Constants (import — never duplicate)

```typescript
import { ATTENDANCE_RULES } from "@/domains/attendance/rules";
// GRACE_PERIOD_DAYS_AFTER_EXPIRY, CALL_LIST_MISSED_OPERATIONAL_DAYS,
// OPERATIONAL_WEEKDAYS, BOOTSTRAP_MEMBER_LIMIT
```

Operational day helpers: `lib/gym-operational-days.ts` (IST Mon–Sat).

## Response shape

```typescript
{
  members,           // roster with recent memberships
  attendanceByDate,  // serialized check-ins for selected date
  todayAttendance,   // today if different from selected date
  callList,          // absent members over missed operational days
  date, today
}
```

## Cache headers

Use `noStoreJson()` from `lib/api-cache` — attendance mutates frequently; bust after check-in/out writes.

## Reassign-date

Zod body: `{ attendanceIds: string[], targetDate: "YYYY-MM-DD" }`

Preserves time-of-day on `checkIn`; shifts calendar date to `targetDate`. Audit log with `gymId`.

## Checklist

- [ ] `requirePermission(session, "canViewMembers")`
- [ ] `requireApiGymId`
- [ ] `ATTENDANCE_RULES` for limits
- [ ] Admin reassign gated `role === "ADMIN"`
