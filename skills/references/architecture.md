# Fitness360 architecture reference

## Modular monolith

See [docs/adr/001-modular-monolith-first.md](../../docs/adr/001-modular-monolith-first.md).

```
Route (app/api) → Domain handler → Adapter (Prisma) → PostgreSQL
                      ↓
                 validation.ts (Zod)
```

Route files stay thin (< ~80 lines). Business rules in `domains/` or `lib/services/` (legacy — prefer domains for new code).

## Domain folder anatomy

```
src/domains/<context>/
  handlers/       # Use-cases (create-payment.ts, list-bills.ts)
  adapters/       # Prisma queries
  validation.ts   # Zod schemas
  types.ts        # Domain types
  interfaces.ts   # Ports
  index.ts        # Public exports
  rules.ts        # Pure business rules (optional) — see business-rules.md
```

**Business rules:** Domain `rules.ts` slices compose into `BUSINESS_RULES` (`src/domains/kernel/business-rules.ts`). All payment/member writes go through `src/lib/crud-business-validation.ts`. Full reference: [business-rules.md](business-rules.md).

## Product vs marketing (open core)

This repo is the **product app only**. Marketing, playground, and developers portal live in the private **gymkhana-cloud** repo (`www.gymkhana.fit`).

| Surface | URL | Where |
|---------|-----|--------|
| Product app | `app.gymkhana.fit` / self-host | **This repo** |
| Product root | `/` → `/login` or `/dashboard` | `src/app/page.tsx` |
| Marketing / demo | `NEXT_PUBLIC_MARKETING_SITE_URL` (default `https://www.gymkhana.fit`) | **gymkhana-cloud** (not here) |

Product links out via `marketingPath()` in `src/lib/site-config.ts`. Do not add landing, playground, or `/developers` UI to this repo.

ADRs: [docs/adr/](../../docs/adr/) · Dev guide: [docs/DEVELOPMENT.md](../../docs/DEVELOPMENT.md) · Contributing: [CONTRIBUTING.md](../../CONTRIBUTING.md)

## Key Prisma models (grouped)

| Group | Models |
|-------|--------|
| Tenancy | `Account`, `AccountMembership`, `Gym`, `Setting` |
| People | `User`, `UserAuthProvider`, `Member`, `Lead`, `LeadFollowUp` |
| Membership | `Plan`, `Membership`, `FreeTrialVisit` |
| Money | `Payment`, `Bill`, `InvoiceTransaction`, `Expense`, `Salary`, `ExpectedPayment` |
| Collections | `OverdueTracking`, `Reminder`, `ReminderLog` |
| Ops | `Attendance`, `AttendanceUpload`, `AuditLog`, `AdminTask`, `DailyStats`, `ErrorLog` |
| Comms | `CommunicationEvent` (canonical), `WhatsAppSendLog`, `ReminderLog`, `MessageLog` (legacy read) |
| Fitness | `Workout`, `WorkoutExercise`, `Challenge`, `GymClass` |
| Commerce | `Product`, `OrderLine`, `SupplementGstInvoice`, `GymMarketplaceInstall` |
| System | `OutboxEvent`, `JobExecution`, `PasswordResetToken`, `StaffNotification` |

Schema: `prisma/schema.prisma`. Migrations: `prisma/migrations/`.

## API auth classes (`api-auth-classes.ts`)

See [docs/adr/002-api-auth-classes.md](../../docs/adr/002-api-auth-classes.md).

## Tenancy resolution

See [docs/adr/003-mandatory-gym-id.md](../../docs/adr/003-mandatory-gym-id.md).

```typescript
import { resolveAccountIdForRequest } from "@/lib/account-user-scope";
import { resolveGymIdForUser, userCanAccessGym } from "@/lib/gym-scope";

const accountId = await resolveAccountIdForRequest(userId, request);
const gymId = await resolveGymIdForUser(userId, preferredGymId, request);
```

Assert resource ownership: `domains/tenancy/assert-gym-resource.ts`, `memberBelongsToGym()`.

## Important lib modules

| Module | Purpose |
|--------|---------|
| `lib/prisma.ts` | Prisma client singleton |
| `lib/auth.ts` | NextAuth |
| `lib/permissions.ts` | RBAC checks |
| `lib/api-handler.ts` | ApiErrors, createApiHandler |
| `lib/api-response.ts` | Standard JSON shapes |
| `lib/middleware/rate-limit.ts` | In-memory rate limits |
| `lib/security/parse-json-body.ts` | Safe JSON + Zod |
| `lib/security/headers.ts` | Security headers |
| `lib/gym-settings/` | Charge policy, code sequences |
| `lib/billing/invoice-ledger.ts` | Bill allocation/refund |
| `lib/services/member.service.ts` | Legacy member ops |
| `lib/services/payment.service.ts` | Legacy payment ops |
| `lib/services/membership.service.ts` | Membership lifecycle |
| `lib/messaging/whatsapp-copy.ts` | Centralized WABA copy |
| `lib/gym-operational-days.ts` | IST Mon–Sat operational day helpers |
| `lib/services/undo-stack.service.ts` | Payment delete undo restore |
| `lib/services/error-log.service.ts` | Persist `ErrorLog` rows |
| `domains/admin-tasks/service.ts` | Admin inbox sync + resolve |
| `domains/analytics/daily-stats.service.ts` | Materialized per-gym dashboard stats |
| `domains/campaigns/service.ts` | Probe → draft → queue segments |
| `domains/attendance/services/bootstrap.ts` | Attendance page bootstrap payloads |
| `domains/admin-repair/` | Typed admin data fixes |
| `domains/communications/communication-ledger.ts` | Outbound comms write path |

## Public API v1

- Preview: `/api/v1/members`, `/api/v1/analytics/cashflow` only
- OpenAPI: `npm run openapi:generate`

## Cron & background

- **Scheduled:** `GET /api/cron/unified` only (`vercel.json`, `CRON_SECRET`)
- Legacy `/api/cron/*` → 410 Gone
- Inngest: `src/inngest/` — optional async jobs (`ENABLE_DEV_SELF_HEAL` for local shell-out jobs only)
- Outbox: `OutboxEvent` model for durable events

## Agent / MCP (optional)

- Requires `ENABLE_AGENT_API=true` (see `.env.example`)
- `src/lib/mcp/fitness360-mcp.ts`, `npm run mcp:setup`, `npm run mcp:server`
- Dev guide: [docs/DEVELOPMENT.md](../../docs/DEVELOPMENT.md)

## Feature gates (this repo)

| Variable | Purpose |
|----------|---------|
| `ENABLE_AGENT_API` | `/api/agent/*`, `/api/mcp` |
| `ENABLE_DEV_SELF_HEAL` | Dev-only Inngest shell-out jobs (never prod) |

Playground and developers portal flags belong to **gymkhana-cloud**, not this repo.

## Route migration

- ESLint errors on `@/lib/prisma` in routes not listed in `eslint.grandfather-prisma-routes.json`
- `npm run audit:api-routes` — route inventory (stdout; not a committed doc)
- See [docs/adr/001-modular-monolith-first.md](../../docs/adr/001-modular-monolith-first.md) § Compliance

## File conventions

- API routes: `src/app/api/<resource>/route.ts`, dynamic `[id]/route.ts`
- Dashboard pages: `src/app/dashboard/<feature>/page.tsx`
- Server actions: rare — prefer API routes + domain handlers
- Tests: `__tests__/` colocated or `src/**/__tests__/`
- E2E: `e2e/*.spec.ts`

## Docs in repo (OSS layout)

| Doc | Topic |
|-----|-------|
| `README.md` | Clone, run, deploy |
| `CONTRIBUTING.md` | Issues, PRs, conduct, license |
| `docs/DEVELOPMENT.md` | Setup, conventions, CI |
| `docs/adr/README.md` | Architecture decision index |
| `docs/adr/*.md` | Accepted design decisions |
| `prisma/ENV.md` | Database URLs |
| `openapi/openapi.json` | HTTP API spec |
| `skills/` | Agent dev workflows |
