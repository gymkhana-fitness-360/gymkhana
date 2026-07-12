# Playbook: Undo for destructive admin actions

## When to use

Admin deletes or irreversible mutations where **time-limited restore** is required (payments + linked memberships today).

## Pattern

```
Delete request
  → build snapshot (payments, memberships, expectedPayments)
  → transaction: unlink EP → delete memberships by sourcePaymentId → delete payment
  → audit log with undoSnapshot + gymId
  → client dispatches undo-stack-updated
```

## Constants

```typescript
import { PAYMENT_RULES } from "@/domains/payments/rules";
// PAYMENT_RULES.UNDO_DELETE_TTL_MS — 30 minutes
```

## Files

| Piece | Path |
|-------|------|
| Snapshot builder | `lib/services/payment-delete-undo-snapshot.ts` |
| Restore logic | `lib/services/undo-stack.service.ts` |
| API | `app/api/undo/route.ts` |
| Hook | `hooks/use-global-undo.ts` |
| UI | `components/global-undo-button.tsx` in `SiteHeader` |

## Audit log contract

```typescript
await logAction(userId, "payment_deleted", "Payment", paymentId, {
  gymId,
  memberId,
  memberName,
  undoSnapshot, // versioned, type: payment_delete
});
```

`getLatestUndoableAction(gymId)` filters `gymId` + `payment_deleted` + unconsumed snapshot.

## Extending to other entity types

1. Add new `type` to snapshot union (`membership_delete`, etc.)
2. Version field `UNDO_SNAPSHOT_VERSION`
3. Separate restore function — **do not** overload payment restore
4. Update `/dev-learn` if skill guidance changes

## UI copy

Confirm: *"You can undo within 30 minutes from the header."*

Forbidden: promise undo without snapshot; server-side `window.dispatchEvent`.
