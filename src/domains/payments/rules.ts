"use strict";

/** Billing, amounts, dedupe, splits */
export const PAYMENT_RULES = Object.freeze({
  DUPLICATE_AMOUNT_THRESHOLD: 2,
  DUPLICATE_IST_CALENDAR_DAY_SPAN: 3,
  SPLIT_PAYMENT_MAX_SINGLE_PART: 420,
  SPLIT_PAYMENT_SUM_TOLERANCE_RUPEES: 15,
  SPLIT_PAYMENT_SUM_TARGETS: Object.freeze([
    600, 700, 800, 900, 1000, 1500, 1800, 2000, 2200, 2600, 6700,
  ]),
  SPLIT_PAYMENT_WINDOW_MINUTES: 60,
  DUPLICATE_TIME_WINDOW_HOURS: 24,
  MIN_AMOUNT: 100,
  MAX_AMOUNT: 50000,
  AUTO_CREATE_MEMBERSHIP: true,
  AUTO_RESOLVE_OVERDUE: true,
  /** Window for global undo after admin payment delete (audit snapshot restore) */
  UNDO_DELETE_TTL_MS: 30 * 60 * 1000,
  DUPLICATE_DETECTION: Object.freeze({
    CHECK_EXACT_MATCH: true,
    CHECK_NEAR_MATCH: true,
    EXCLUDE_FROM_REPORTS: true,
    SOFT_DELETE: true,
  }),
});

export type ParsedPaymentNotes = {
  raw: string;
  hasDiscount: boolean;
  isPersonalTrainer: boolean;
  seasonalPackage: number | null;
  combinedAmount: number | null;
};

/** PT / discount heuristics from payment notes (AUDIT-018 — keep out of JSX). */
export function inferPaymentNotesMeta(
  notes: string | null,
  paymentAmount?: number,
): ParsedPaymentNotes | null {
  if (!notes) return null;

  const notesLower = notes.toLowerCase();
  const hasPTKeywords =
    notesLower.includes("personal trainer") ||
    notesLower.includes("pt") ||
    notesLower.includes("trainer");

  const combinedPattern = /(\d+)\s*\+\s*(\d+)/g;
  const combinedMatches = notes.match(combinedPattern);
  let hasPTAmount = false;
  let totalCombinedAmount = 0;

  if (combinedMatches) {
    for (const match of combinedMatches) {
      const parts = match.split("+").map((p) => parseFloat(p.trim()));
      const sum = parts.reduce((a, b) => a + b, 0);
      totalCombinedAmount = Math.max(totalCombinedAmount, sum);
      if (sum >= 1800) hasPTAmount = true;
    }
  }

  const isPTByAmount =
    paymentAmount !== undefined &&
    (paymentAmount >= 1800 || paymentAmount >= 4500);

  const isPersonalTrainer = hasPTKeywords || hasPTAmount || isPTByAmount;
  const hasDiscount =
    notesLower.includes("friends") ||
    notesLower.includes("family") ||
    notesLower.includes("discount");
  const seasonalMatch = notes.match(/(\d+)\s*months?/i);

  return {
    raw: notes,
    hasDiscount,
    isPersonalTrainer,
    seasonalPackage: seasonalMatch ? parseInt(seasonalMatch[1], 10) : null,
    combinedAmount: totalCombinedAmount > 0 ? totalCombinedAmount : null,
  };
}
