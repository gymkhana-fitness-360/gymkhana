# Admit member with payment

Golden path for new member admission including initial payment.

## Reads (in order)

1. [references/business-rules.md](../../references/business-rules.md) — payments, status, plans
2. `src/domains/members/services/admit-member-with-payment.ts`
3. `src/domains/memberships/` — plan selection
4. `src/app/dashboard/members/new/page.tsx`
5. [rules/tenant-scope.mdc](../../rules/tenant-scope.mdc)
6. [rules/business-rules.mdc](../../rules/business-rules.mdc)

## Key pitfalls

- `Plan.id` is globally unique — not per-gym
- Synthetic `contactNumber` for email-only users: `e:{email}`
- Use `formatCurrency()` for fee display

## Validate

```bash
npm run test:e2e:smoke
npm run typecheck
```
