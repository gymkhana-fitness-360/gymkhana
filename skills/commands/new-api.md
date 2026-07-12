---
name: dev-new-api
description: Step-by-step workflow for adding a new API endpoint
always: false
---

# New API (`/dev-new-api`)

**Usage:** `/dev-new-api` — adding `src/app/api/<path>/route.ts`

## Ordered steps

1. Read [rules/api-routes.mdc](../rules/api-routes.mdc) + [rules/tenant-scope.mdc](../rules/tenant-scope.mdc) + [rules/business-rules.mdc](../rules/business-rules.mdc)
2. Domain handler — `src/domains/<domain>/handlers/<action>.ts`
3. Zod schema — `src/domains/<domain>/validation.ts`
4. Thin route — [references/templates/api-route.ts](../references/templates/api-route.ts)
5. Auth class — if public, `src/lib/security/api-auth-classes.ts`
6. Permission — `requirePermission(session, "canEdit…")` if staff-facing
7. `/dev-validate --quick`

Use `validatePaymentCreateContext()` before persisting payments — see [rules/business-rules.mdc](../rules/business-rules.mdc).

## Task → reads

| Topic | File |
|-------|------|
| HTTP design | `.cursor/skills/api-design/SKILL.md` |
| Payment playbook | `references/playbooks/add-payment.md` |
| Cron / ops | `rules/operations.mdc` + `references/playbooks/cron-and-background.md` |
| Campaign | `rules/comms-ops.mdc` + `references/playbooks/whatsapp-campaign.md` |

## Checklist

- [ ] Handler in `src/domains/`
- [ ] Zod on mutating body
- [ ] Rate limit + auth
- [ ] Tenant scoped
- [ ] Business rules validators on writes (`crud-business-validation.ts`)
- [ ] `/dev-validate` passes
