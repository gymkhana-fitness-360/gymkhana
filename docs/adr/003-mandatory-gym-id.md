# ADR-003: Mandatory gymId on tenant data access

**Status:** Accepted  
**Date:** 2026-05-20  
**Story:** GYM-P0-010  

## Context

Multi-gym accounts share one PostgreSQL schema. Several services queried `Member` and related tables without `gymId`, leaking data across tenants.

## Decision

1. Every `prisma.*.findMany` / `findFirst` / `groupBy` on tenant-owned models must include `gymId` in `where`, or run through a domain helper that does.
2. API routes resolve gym via `requireApiGymId(session, request)` before data access.
3. Member-scoped routes verify `memberBelongsToGym(memberId, gymId)` before reads/writes.
4. `npm run audit:tenant-scope` reports suspicious call sites in CI (non-blocking until burn-down).

## Consequences

- Cross-tenant reads are a Sev-1 incident.
- Agent/AI APIs are blocked until audit is clean on critical routes.
- Legacy calendar overdue mode must pass `gymId` on all queries.
