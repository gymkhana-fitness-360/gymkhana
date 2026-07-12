# Add payment flow

Golden path for recording a payment linked to billing.

## Reads (in order)

1. [references/business-rules.md](../../references/business-rules.md) — amounts, dedupe, dates
2. `src/domains/payments/handlers/` — existing create handlers
3. `src/domains/billing/handlers/` — bill allocation if applicable
4. [rules/tenant-scope.mdc](../../rules/tenant-scope.mdc)
5. [rules/business-rules.mdc](../../rules/business-rules.mdc)
6. [rules/ui-kit.mdc](../../rules/ui-kit.mdc) — `formatCurrency`, `dashboard-quick-entry.tsx`

## API pattern

- POST `/api/payments` or domain-specific route
- Handler: `src/domains/payments/handlers/create-payment.ts`
- Zod schema in `src/domains/payments/validation.ts`
- Scope by `accountId` + `gymId`

## UI pattern

- Dashboard quick entry: `src/components/dashboard/dashboard-quick-entry.tsx`
- Or member detail payment section

## Validate

```bash
npm run audit:tenant-scope:p0
npm run typecheck
```
