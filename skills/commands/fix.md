---
name: dev-fix
description: Fix typecheck, lint, and audit failures iteratively until clean (max 6 iterations)
always: false
---

# Fix (`/dev-fix`)

**Usage:** `/dev-fix` — when typecheck, lint, or skill audits fail.

## Step 1: Prerequisites

Follow [rules/prerequisites-check.mdc](../rules/prerequisites-check.mdc). STOP if `.env` or Node is wrong.

## Step 2: Baseline

Run `/dev-validate` and capture failing categories.

```bash
tsx skills/scripts/validate.ts
```

## Step 3: Fix by priority

Follow [rules/validation-workflow.mdc](../rules/validation-workflow.mdc):

1. Tenant P0 — scope queries by `accountId`/`gymId`
2. TypeScript — fix types in touched files
3. Mutating Zod — schema + `parseJsonBody`
4. Lint — eslint on changed files
5. Unit tests — `npm run test:ci`
6. Smoke — only if auth/dashboard broken

## Step 4: Re-validate (up to 6×)

Run `/dev-validate` after each fix batch.

## Step 5: Learnings

If you diverged from skill guidance: `/dev-learn capture …` or `/dev-learn auto --staged`

## Step 6: Report

```
✓ Fitness360 fix complete — <n> iterations
  typecheck: pass | lint: pass | tenant P0: pass | zod audit: pass
```

Do **not** claim complete if any gate still fails.
