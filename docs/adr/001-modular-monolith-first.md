# ADR-001: Modular monolith before microservices

**Status:** Accepted  
**Date:** 2026-05-19  
**Updated:** 2026-07-12  
**Deciders:** Platform / engineering  

## Context

Fitness360 runs as a single Next.js deployment with **~165 API routes**, one PostgreSQL database, Inngest jobs, and Vercel Cron (`/api/cron/unified`). WhatsApp reminders and campaigns run in the monolith via Meta Cloud API and `src/domains/communications/*` — there is no separate reminder microservice. We need clearer boundaries for security (agent API), team velocity, and optional service extraction—without a risky rewrite.

## Decision

1. **Standardize on a modular monolith** inside the repo (`src/domains/*`, future `packages/domain-*`).
2. **API route handlers stay thin** (< ~80 lines); business logic lives in domain handlers + Prisma adapters.
3. **Extract services only when justified** — communications remain in-process until scale or compliance requires split.
4. **Single PostgreSQL database** until read-replica or compliance forces partition.
5. **One scheduled cron path** — Vercel calls `/api/cron/unified` only; legacy cron URLs return 410 during deprecation.

## Consequences

### Positive

- Stable URLs and one deploy unit during migration.
- Shared transactions for member + payment flows.
- Lower operational cost than many microservices.

### Negative

- Discipline required (lint rules, route audit) to prevent `prisma` in `app/api`.
- Large bundle until optional worker split.

## Compliance

- Route migration tracked via `npm run audit:api-routes`.
- ESLint errors on `@/lib/prisma` imports in `src/app/api/**/route.ts` (grandfather list shrinking incrementally).
