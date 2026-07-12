import { describe, expect, it } from "@jest/globals";
import { DEFAULT_CALIBRATION } from "@/domains/revenue-opportunities/calibration";
import { computeMemberPredictions } from "@/domains/revenue-opportunities/predictions";
import type { MemberOpportunityInput } from "@/domains/revenue-opportunities/types";

const baseInput: MemberOpportunityInput = {
  memberId: "m1",
  memberName: "Test",
  membershipValue: 2000,
  daysToExpiry: 5,
  overdueAmount: 0,
  attendanceLast30Days: 10,
  paymentsLast90Days: 2,
  remindersLast30Days: 0,
  daysSinceLastPayment: 14,
};

describe("computeMemberPredictions", () => {
  it("labels engaged member high readiness", () => {
    const r = computeMemberPredictions(baseInput, DEFAULT_CALIBRATION);
    expect(r.predictionLabel).toBe("LIKELY_TO_PAY");
    expect(r.readinessScore).toBeGreaterThanOrEqual(62);
    expect(r.outcomeSummary).not.toContain("within 7 days");
  });

  it("labels ghost overdue member low readiness", () => {
    const r = computeMemberPredictions(
      {
        ...baseInput,
        daysToExpiry: -45,
        attendanceLast30Days: 0,
        paymentsLast90Days: 0,
        daysSinceLastPayment: 120,
        remindersLast30Days: 4,
      },
      DEFAULT_CALIBRATION,
    );
    expect(r.predictionLabel).toBe("UNLIKELY");
    expect(r.churnRisk).toBeGreaterThanOrEqual(72);
  });

  it("is deterministic", () => {
    expect(computeMemberPredictions(baseInput, DEFAULT_CALIBRATION)).toEqual(
      computeMemberPredictions(baseInput, DEFAULT_CALIBRATION),
    );
  });
});
