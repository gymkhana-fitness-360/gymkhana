import {
  computeBillTotal,
  deriveBillStatus,
} from "@/lib/billing/invoice-ledger";
import { BillStatus } from "@prisma/client";

describe("invoice-ledger", () => {
  describe("computeBillTotal", () => {
    it("sums subscription fee, tax, and discount", () => {
      expect(
        computeBillTotal({
          subscriptionFee: 1000,
          amount: null,
          tax: 180,
          discountAmount: 50,
        }),
      ).toBe(1130);
    });

    it("falls back to amount when subscription fee missing", () => {
      expect(
        computeBillTotal({
          subscriptionFee: null,
          amount: 500,
          tax: 0,
          discountAmount: 0,
        }),
      ).toBe(500);
    });

    it("never returns negative totals", () => {
      expect(
        computeBillTotal({
          subscriptionFee: 100,
          amount: null,
          tax: 0,
          discountAmount: 500,
        }),
      ).toBe(0);
    });
  });

  describe("deriveBillStatus", () => {
    const futureDue = new Date(Date.now() + 86400000);
    const pastDue = new Date(Date.now() - 86400000);

    it("marks zero-total bills as PAID", () => {
      expect(deriveBillStatus(0, 0, futureDue)).toBe(BillStatus.PAID);
    });

    it("marks unpaid future-due bills as ISSUED", () => {
      expect(deriveBillStatus(0, 1000, futureDue)).toBe(BillStatus.ISSUED);
    });

    it("marks unpaid past-due bills as OVERDUE", () => {
      expect(deriveBillStatus(0, 1000, pastDue)).toBe(BillStatus.OVERDUE);
    });

    it("marks partial payment as PARTIAL", () => {
      expect(deriveBillStatus(400, 1000, futureDue)).toBe(BillStatus.PARTIAL);
    });

    it("marks full payment as PAID", () => {
      expect(deriveBillStatus(1000, 1000, pastDue)).toBe(BillStatus.PAID);
    });

    it("marks zero paid after refund as ISSUED when not past due", () => {
      expect(deriveBillStatus(0, 1000, futureDue)).toBe(BillStatus.ISSUED);
    });
  });
});
