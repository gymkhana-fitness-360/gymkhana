# ADR-002: API edge auth classes

**Status:** Accepted  
**Date:** 2026-05-20  
**Story:** GYM-P0-009  

## Context

Next.js middleware applied NextAuth JWT to almost all `/api/*` routes. Cron jobs and payment webhooks use `Authorization: Bearer` or HMAC signatures, not session cookies. Blocking them at the edge caused 401 before route handlers could validate secrets.

## Decision

Classify every route at the middleware edge into one of four auth classes (see `src/lib/security/api-auth-classes.ts`):

| Class | Middleware | Handler |
|-------|------------|---------|
| PUBLIC | Allow | None |
| SESSION | Require JWT | RBAC + gymId |
| CRON_BEARER | Allow | `verifyCronRequest()` |
| WEBHOOK_SIGNED | Allow | Provider signature |

Production `/playground` is SESSION despite PUBLIC classification in dev.

## Consequences

- Cron and webhooks must still fail closed in handlers.
- New integration routes must pick a class explicitly.
- See `src/lib/security/api-auth-classes.ts` and [docs/DEVELOPMENT.md](../DEVELOPMENT.md).
