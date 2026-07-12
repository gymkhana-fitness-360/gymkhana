import {
  clusterPaymentDuplicateIndices,
  pickPaymentDuplicateKeeper,
  type PayRowDedupe,
} from "../payment-dedupe-clustering";
import { BUSINESS_RULES } from "../business-rules";

function row(
  id: string,
  receivedAt: string,
  amount: number,
  createdAtMs: number,
  ep: boolean
): PayRowDedupe {
  return {
    id,
    memberId: "m1",
    amount,
    receivedAt: new Date(receivedAt),
    createdAt: new Date(createdAtMs),
    ExpectedPayment: ep ? { id: "ep1" } : null,
  };
}

describe("payment-dedupe-clustering", () => {
  it("merges same-day amounts within ₹5", () => {
    const bucket = [
      row("a", "2026-03-05T00:00:00.000Z", 800, 1000, false),
      row("b", "2026-03-05T00:00:00.000Z", 799, 2000, false),
    ];
    const clusters = clusterPaymentDuplicateIndices(bucket);
    expect(clusters.some((c) => c.length === 2)).toBe(true);
  });

  it("merges across 2 IST calendar days when within span", () => {
    const bucket = [
      row("a", "2026-03-05T00:00:00.000Z", 800, 1000, false),
      row("b", "2026-03-07T00:00:00.000Z", 799, 2000, false),
    ];
    const span = BUSINESS_RULES.PAYMENT.DUPLICATE_IST_CALENDAR_DAY_SPAN;
    expect(span).toBe(2);
    const clusters = clusterPaymentDuplicateIndices(bucket, span);
    expect(clusters.some((c) => c.length === 2)).toBe(true);
  });

  it("does not merge when 3+ IST days apart", () => {
    const bucket = [
      row("a", "2026-03-05T00:00:00.000Z", 800, 1000, false),
      row("b", "2026-03-09T00:00:00.000Z", 799, 2000, false),
    ];
    const clusters = clusterPaymentDuplicateIndices(bucket, 2);
    expect(clusters.every((c) => c.length === 1)).toBe(true);
  });

  it("does not merge likely split pair (same day)", () => {
    const bucket = [
      row("a", "2026-03-05T00:00:00.000Z", 349, 1000, false),
      row("b", "2026-03-05T00:00:00.000Z", 350, 2000, false),
    ];
    const clusters = clusterPaymentDuplicateIndices(bucket);
    expect(clusters.every((c) => c.length === 1)).toBe(true);
  });

  it("pickPaymentDuplicateKeeper prefers ExpectedPayment", () => {
    const bucket = [
      row("a", "2026-03-05T00:00:00.000Z", 800, 3000, false),
      row("b", "2026-03-05T00:00:00.000Z", 799, 1000, true),
    ];
    const clusters = clusterPaymentDuplicateIndices(bucket);
    const big = clusters.find((c) => c.length === 2)!;
    const keeper = pickPaymentDuplicateKeeper(big, bucket);
    expect(bucket[keeper].id).toBe("b");
  });
});
