# Business rules

Authoritative constants and validation gates for Fitness360 gym operations. **Never hard-code magic numbers** — import from domain rule slices or `BUSINESS_RULES`.

## Source of truth

| Layer | Path | Use |
|-------|------|-----|
| Domain slices | `src/domains/<domain>/rules.ts` | Prefer for new code |
| Aggregate | `src/domains/kernel/business-rules.ts` → `BUSINESS_RULES` | Legacy aggregate shape |
| Re-export | `@/lib/business-rules` | Deprecated — use domain import |
| Write gate | `src/lib/crud-business-validation.ts` | **Call before any payment/member write** |
| API mapping | `BusinessRuleViolation` → `ApiErrors.businessRule()` | In route/handler catch blocks |

```typescript
import { PAYMENT_RULES } from "@/domains/payments/rules";
import { validatePaymentCreateContext, BusinessRuleViolation } from "@/lib/crud-business-validation";
```

---

## Payments (`PAYMENT_RULES`)

| Rule | Value | Notes |
|------|-------|-------|
| Min amount | ₹100 | `allowBelowMinimum` only for failed/non-completed ledger rows |
| Max amount | ₹50,000 | |
| Duplicate threshold | ±₹2 | Same amount within window → duplicate candidate |
| Duplicate IST calendar span | 3 days | Dedupe clustering |
| Duplicate time window | 24 hours | |
| Split payment max single part | ₹420 | Pairs below this may be split, not duplicate |
| Split sum targets | 600, 700, 800, … | See `SPLIT_PAYMENT_SUM_TARGETS` in code |
| Split sum tolerance | ±₹15 | |
| Split window | 60 minutes | |
| Auto-create membership | `true` | On qualifying payment |
| Auto-resolve overdue | `true` | |

**Dedupe helpers:** `isDuplicateAmount()`, `isLikelySplitPaymentPair()`, `shouldMergePaymentDuplicates()` in `@/domains/kernel/business-rules`.

**WhatsApp import:** must respect duplicate detection flags (`CHECK_EXACT_MATCH`, `CHECK_NEAR_MATCH`, `SOFT_DELETE`).

---

## Memberships & plans (`MEMBERSHIP_RULES`, `PLAN_RULES`)

| Rule | Value |
|------|-------|
| Monthly duration | 30 days |
| Quarterly | 90 days |
| Half-yearly | 180 days |
| Yearly | 365 days |
| Default duration | 30 days |
| Grace period | 3 days after expiry |
| Overdue tracking starts | 7 days |
| Renew extend from | Current `endDate` (not today) |

**Plan catalog:** `PLAN_RULES.REQUIRED_PLANS` — seed defaults (monthly gym 699/799, PT tiers, 3/6 month bundles).

**Critical:** `Plan.id` is **globally unique** across gyms — not per-tenant. Membership service may auto-create plans.

**Duration inference:** `getMembershipDuration(durationType)` — parses YEAR/6/HALF/3/QUARTER → days.

---

## Member status (`STATUS_RULES`)

| From | Allowed to |
|------|------------|
| `ACTIVE` | `EXPIRED` |
| `EXPIRED` | `ACTIVE` |

- **Audit required:** `EXPIRED → ACTIVE` (`REQUIRE_AUDIT`)
- **Derive status from membership**, not ad-hoc UI toggles (`QUERY_BY_MEMBERSHIP_NOT_STATUS`)
- Use `assertMemberStatusTransition(from, to)` before persisting status changes

**Determination:**

| Condition | Status |
|-----------|--------|
| Valid membership | `ACTIVE` |
| Expired membership | `EXPIRED` |
| No membership | `EXPIRED` |

---

## Validation limits (`VALIDATION_RULES`)

| Field | Min | Max |
|-------|-----|-----|
| Phone (digits) | 10 | 15 |
| Name (trimmed) | 1 | 100 |
| Amount | ₹100 | ₹50,000 |

Phone must be unique per gym. Email users use synthetic `contactNumber`: `e:{email}`.

---

## Walk-in & attendance

**Walk-in (`WALK_IN_VISIT_RULES`):**

| Kind | Rule |
|------|------|
| `FREE_TRIAL` | Amount must be `0` or null; max **2 lifetime** per phone |
| `DAY_PASS` | Amount required; ₹1 – ₹50,000 |

**Attendance (`ATTENDANCE_RULES`):**

| Rule | Value |
|------|-------|
| Max check-ins per day | 2 |
| Auto checkout after | 4 hours |
| Operational weekdays | Mon–Sat (Sun closed) |
| Call-list missed operational days | 3 |
| Roster grace after expiry | 7 days |
| Bootstrap member limit | 2000 |

Helpers: `lib/gym-operational-days.ts`. Playbook: [playbooks/attendance-bootstrap.md](playbooks/attendance-bootstrap.md).

**Payment undo (`PAYMENT_RULES.UNDO_DELETE_TTL_MS`):** 30 minutes — audit snapshot restore window. Playbook: [playbooks/undo-destructive-action.md](playbooks/undo-destructive-action.md).

---

## Reminders (`REMINDER_RULES`)

| Cadence | Days |
|---------|------|
| Before expiry | 7, 3, 1 |
| After expiry | 1, 3, 7 |
| Max per member per month | 5 |

---

## Date & time (`DATETIME_RULES`, `TIMEZONE_RULES`)

| Policy | Value |
|--------|-------|
| Timezone | `Asia/Kolkata` (IST) |
| UI dates | Date-only — **never show clock time** in member-facing UI |
| DB `@db.Date` columns | Calendar date in IST via `normalizeStorageCalendarDate()` / `toDateOnlyIST()` |
| Payment date | Calendar date, not timestamp |

---

## Identity & member protection (`MEMBER_PROTECTION_RULES`)

| Rule | Detail |
|------|--------|
| Member code prefix | `MEM-` |
| Pattern | `/^MEM-\d+$/` |
| Admin reserved IDs | `MEM000`, `MEMXXX` — do not reassign |
| Protected fields | `id`, `phone`, `joinDate` |

See `src/lib/member-protection.ts` for reserved member ranges and admin phone map.

---

## Billing & charges (gym settings)

Per-gym policy from `getChargePolicy(gymId)`:

- Admission fee (`chargeAdmissionFeeKey`)
- Tax percent (`chargeTaxPercentKey`)
- Discount presets (`chargeDiscountPresetsKey`)

Bill status derived via `deriveBillStatus()` / `src/lib/billing/invoice-ledger.ts`.

---

## Currency

- **Product / dashboard:** INR (₹) — `formatCurrency()` from `@/lib/utils`
- Gym `currencyCode` default: `INR` (`src/lib/currency.ts`)
- Amount validation uses rupee integers in `PAYMENT_RULES` (whole rupees in most paths)

---

## Enforcement checklist (every write path)

- [ ] Call `validatePaymentCreateContext()` or `validatePaymentAmount()` before payment insert
- [ ] Call `validateMemberPhoneDigits()` / `validateMemberDisplayName()` on member create/update
- [ ] Call `assertMemberStatusTransition()` on status change
- [ ] Call `validateWalkInVisitAmount()` + `assertFreeTrialLifetimeAllowed()` for walk-ins
- [ ] Catch `BusinessRuleViolation` → `ApiErrors.businessRule(message, code)` — never generic 500 for rule failures
- [ ] Import constants from `domains/*/rules.ts` — no duplicated thresholds in handlers
- [ ] Tenant-scope all reads/writes (`accountId` / `gymId`)

---

## Verify

```bash
npm run validate:business-rules    # CRUD rule consistency check (when script present)
npm run test:ci                  # includes payment/member edge-case tests
```

Related tests: `src/lib/services/__tests__/payment-edge-cases.test.ts`, `payment-dedupe-clustering.test.ts`.

---

## When changing rules

1. Edit the owning `src/domains/<domain>/rules.ts` slice
2. Update `crud-business-validation.ts` if validation logic changes
3. Update this doc if behavior is user-visible
4. Run `/dev-validate --quick`
5. `/dev-learn capture` if you intentionally diverge from prior skill guidance
