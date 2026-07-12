---
name: dev-validate
description: Mandatory completion gates before PR or task done
always: false
argument-hint: "[--quick]"
---

# Validate (`/dev-validate`)

**Usage:** `/dev-validate` (full) or `/dev-validate --quick` (mid-task)

## Execute

```bash
tsx skills/scripts/validate.ts
tsx skills/scripts/validate.ts --quick
```

## Completion gates — ZERO TOLERANCE

| Gate | Check | Underlying (invoked by script) |
|------|-------|--------------------------------|
| **G1 – Environment** | Node 20.9+, `.env` | `/dev-debug` |
| **G2 – TypeScript** | Zero TS errors | `npm run typecheck` |
| **G3 – Tenant P0** | No cross-tenant leaks | `npm run audit:tenant-scope:p0` |
| **G4 – Mutating Zod** | Schemas on mutating routes | `npm run audit:mutating-zod` |
| **G5 – Lint** | ESLint clean | `npm run lint` |
| **G6 – Unit tests** | CI-safe suite | `npm run test:ci` |
| **G7 – Schema** | Migration on clean DB (if schema changed) | `npx prisma migrate deploy` |
| **G8 – Smoke** (dashboard changes) | Login + dashboard | `npm run test:e2e:smoke` |

`--quick` skips G1, G6–G8.

## If any gate fails

Route to `/dev-fix` — do **not** mark task complete.
