"use strict";

/**
 * Duplicate payment clustering for cleanup scripts and admin API.
 * Uses BUSINESS_RULES.PAYMENT (amount threshold, IST day span, split-pair detection).
 */

import { BUSINESS_RULES, shouldMergePaymentDuplicates } from "./business-rules";
import { calendarDaysApartIST } from "./date-only";

export type PayRowDedupe = {
  id: string;
  memberId: string;
  amount: unknown;
  receivedAt: Date;
  createdAt: Date;
  ExpectedPayment: { id: string } | null;
};

class UnionFind {
  private p: number[];
  constructor(n: number) {
    this.p = Array.from({ length: n }, (_, i) => i);
  }
  find(i: number): number {
    if (this.p[i] !== i) this.p[i] = this.find(this.p[i]);
    return this.p[i];
  }
  union(i: number, j: number) {
    const ri = this.find(i);
    const rj = this.find(j);
    if (ri !== rj) this.p[ri] = rj;
  }
}

/**
 * Cluster payment row indices: same bucket must be pre-filtered (e.g. same member).
 * Pairs merge if IST calendar days apart ≤ maxSpanDays and shouldMergePaymentDuplicates(amounts).
 */
export function clusterPaymentDuplicateIndices(
  rows: PayRowDedupe[],
  maxSpanDays: number = BUSINESS_RULES.PAYMENT.DUPLICATE_IST_CALENDAR_DAY_SPAN
): number[][] {
  const n = rows.length;
  if (n === 0) return [];
  const sortedIdx = [...Array(n).keys()].sort(
    (ia, ib) => rows[ia].receivedAt.getTime() - rows[ib].receivedAt.getTime()
  );
  const uf = new UnionFind(n);
  for (let ii = 0; ii < n; ii++) {
    const i = sortedIdx[ii]!;
    const ai = Number(rows[i].amount);
    for (let jj = ii + 1; jj < n; jj++) {
      const j = sortedIdx[jj]!;
      if (calendarDaysApartIST(rows[i].receivedAt, rows[j].receivedAt) > maxSpanDays) {
        break;
      }
      const aj = Number(rows[j].amount);
      if (shouldMergePaymentDuplicates(ai, aj)) uf.union(i, j);
    }
  }
  const map = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const r = uf.find(i);
    if (!map.has(r)) map.set(r, []);
    map.get(r)!.push(i);
  }
  return [...map.values()];
}

export function pickPaymentDuplicateKeeper(indices: number[], rows: PayRowDedupe[]): number {
  const sorted = [...indices].sort((ia, ib) => {
    const a = rows[ia];
    const b = rows[ib];
    const epA = a.ExpectedPayment ? 1 : 0;
    const epB = b.ExpectedPayment ? 1 : 0;
    if (epA !== epB) return epB - epA;
    const amtA = Number(a.amount);
    const amtB = Number(b.amount);
    if (amtA !== amtB) return amtB - amtA;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
  return sorted[0]!;
}
