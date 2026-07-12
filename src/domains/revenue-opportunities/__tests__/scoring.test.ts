import { describe, expect, it } from "@jest/globals";
import { DEFAULT_CALIBRATION } from "@/domains/revenue-opportunities/calibration";
import { scoreOpportunity } from "@/domains/revenue-opportunities/scoring";
import type { MemberOpportunityInput } from "@/domains/revenue-opportunities/types";

const baseInput: MemberOpportunityInput = {
  memberId: "m1",
  memberName: "Test Member",
  membershipValue: 1500,
  daysToExpiry: 30,
  overdueAmount: 0,
  attendanceLast30Days: 8,
  paymentsLast90Days: 1,
  remindersLast30Days: 0,
  daysSinceLastPayment: 10,
};

const cal = DEFAULT_CALIBRATION;

describe("scoreOpportunity", () => {
  it("returns HIGH priority for overdue member with no attendance", () => {
    const result = scoreOpportunity(
      {
        ...baseInput,
        daysToExpiry: -10,
        overdueAmount: 1500,
        attendanceLast30Days: 0,
        daysSinceLastPayment: 60,
      },
      cal,
    );

    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.priority).toBe("HIGH");
    expect(result.amountAtRisk).toBe(1500);
    expect(result.reasons.some((r) => r.includes("overdue"))).toBe(true);
    expect(result.reasons.some((r) => r.includes("attendance"))).toBe(true);
  });

  it("returns LOW priority for active member with strong attendance", () => {
    const result = scoreOpportunity(
      {
        ...baseInput,
        daysToExpiry: 45,
        attendanceLast30Days: 16,
        paymentsLast90Days: 2,
        daysSinceLastPayment: 5,
      },
      cal,
    );

    expect(result.score).toBeLessThan(40);
    expect(result.priority).toBe("LOW");
  });

  it("is deterministic for identical inputs", () => {
    const input: MemberOpportunityInput = {
      ...baseInput,
      daysToExpiry: 5,
      overdueAmount: 0,
      attendanceLast30Days: 2,
      remindersLast30Days: 0,
    };
    const a = scoreOpportunity(input, cal);
    const b = scoreOpportunity(input, cal);
    expect(a).toEqual(b);
  });

  it("adds expiry reason when membership expires within 7 days", () => {
    const result = scoreOpportunity({ ...baseInput, daysToExpiry: 3 }, cal);
    expect(result.reasons.some((r) => r.includes("expires in 3"))).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(25);
  });

  it("reduces score when many reminders already sent", () => {
    const without = scoreOpportunity(
      { ...baseInput, daysToExpiry: 5, remindersLast30Days: 0 },
      cal,
    );
    const withMany = scoreOpportunity(
      { ...baseInput, daysToExpiry: 5, remindersLast30Days: 4 },
      cal,
    );
    expect(withMany.score).toBeLessThan(without.score);
  });

  it("never returns score above 100 or below 0", () => {
    const extreme = scoreOpportunity(
      {
        ...baseInput,
        daysToExpiry: -90,
        overdueAmount: 50000,
        attendanceLast30Days: 0,
        paymentsLast90Days: 0,
        remindersLast30Days: 0,
        daysSinceLastPayment: 200,
      },
      cal,
    );
    expect(extreme.score).toBeLessThanOrEqual(100);
    expect(extreme.score).toBeGreaterThanOrEqual(0);
    expect(extreme.readinessScore).toBeLessThanOrEqual(100);
  });
});
