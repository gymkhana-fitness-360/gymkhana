---
name: dev-new-dashboard
description: Step-by-step workflow for adding a dashboard page
always: false
---

# New dashboard page (`/dev-new-dashboard`)

**Usage:** `/dev-new-dashboard` — adding `src/app/dashboard/<area>/page.tsx`

## Ordered steps

1. Read [rules/ui-kit.mdc](../rules/ui-kit.mdc) + [references/ui-kit.md](../references/ui-kit.md)
2. Skim `learnings/LEARNINGS.md`
3. Layout — existing dashboard shell (server component where possible)
4. Components — shadcn + `src/components/<feature>/`
5. Data — `/api/*` per existing page pattern
6. Nav — `src/components/app-sidebar.tsx` if user-facing
7. Money — `formatCurrency()` for all ₹
8. `/dev-validate --quick`

## Forbidden

- Hardcoded gray Tailwind scales
- Marketing/playground patterns in dashboard
- Inline Prisma in page components

## Review

`.cursor/skills/ui-ux-pro-max` for polish before merge.
