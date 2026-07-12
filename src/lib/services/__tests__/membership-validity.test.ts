/**
 * MEMBERSHIP VALIDITY TESTS
 * 
 * Tests the membership validity logic.
 * 
 * BUSINESS DECISION: Plan inference now defaults to "monthly" (30 days) for all amounts.
 * For multi-month plans, the planId must be explicitly provided (not inferred from amount).
 */

import { inferPlanFromAmount, DEFAULT_MONTHLY_PLAN_ID } from '../plan-inference';

describe('Membership Validity Logic', () => {
  const TODAY = new Date('2026-03-30');
  TODAY.setHours(0, 0, 0, 0);

  /**
   * Helper function to check if a payment should result in an ACTIVE membership
   * Uses the inferred duration (always 30 days now)
   */
  function shouldBeActive(paymentDate: Date, amount: number): boolean {
    const inferred = inferPlanFromAmount(amount);
    const expectedEndDate = new Date(paymentDate);
    expectedEndDate.setDate(expectedEndDate.getDate() + inferred.durationDays);
    
    return expectedEndDate >= TODAY;
  }

  /**
   * Helper for explicit duration testing (for multi-month plans with explicit planId)
   */
  function shouldBeActiveWithDuration(paymentDate: Date, durationDays: number): boolean {
    const expectedEndDate = new Date(paymentDate);
    expectedEndDate.setDate(expectedEndDate.getDate() + durationDays);
    return expectedEndDate >= TODAY;
  }

  describe('March 2026 payments (should be ACTIVE)', () => {
    it('should mark March 30 payment as ACTIVE', () => {
      const paymentDate = new Date('2026-03-30');
      const amount = 700;
      
      const result = shouldBeActive(paymentDate, amount);
      
      expect(result).toBe(true);
      // March 30 + 30 days = April 29 (>= March 30) ✅
    });

    it('should mark March 1 payment as ACTIVE', () => {
      const paymentDate = new Date('2026-03-01');
      const amount = 700;
      
      const result = shouldBeActive(paymentDate, amount);
      
      expect(result).toBe(true);
      // March 1 + 30 days = March 31 (>= March 30) ✅
    });

    it('should mark March 15 payment as ACTIVE', () => {
      const paymentDate = new Date('2026-03-15');
      const amount = 800;
      
      const result = shouldBeActive(paymentDate, amount);
      
      expect(result).toBe(true);
      // March 15 + 30 days = April 14 (>= March 30) ✅
    });
  });

  describe('February 2026 payments with 30-day plan (inferred)', () => {
    it('should mark Feb 28 payment as ACTIVE (edge case)', () => {
      const paymentDate = new Date('2026-02-28');
      const amount = 700;
      
      const result = shouldBeActive(paymentDate, amount);
      
      expect(result).toBe(true);
      // Feb 28 + 30 days = March 30 (>= March 30) ✅
    });

    it('should mark Feb 27 payment as EXPIRED', () => {
      const paymentDate = new Date('2026-02-27');
      const amount = 700;
      
      const result = shouldBeActive(paymentDate, amount);
      
      expect(result).toBe(false);
      // Feb 27 + 30 days = March 29 (< March 30) ❌
    });

    it('should mark Feb 1 payment as EXPIRED (30-day plan only)', () => {
      const paymentDate = new Date('2026-02-01');
      const amount = 700;
      
      const result = shouldBeActive(paymentDate, amount);
      
      expect(result).toBe(false);
      // Feb 1 + 30 days = March 3 (< March 30) ❌
    });
  });

  describe('Explicit multi-month plans (planId provided, not inferred)', () => {
    it('should mark Feb 1 payment with explicit 90-day plan as ACTIVE', () => {
      const paymentDate = new Date('2026-02-01');
      
      // When planId is explicitly provided, use the plan's duration
      const result = shouldBeActiveWithDuration(paymentDate, 90);
      
      expect(result).toBe(true);
      // Feb 1 + 90 days = May 2 (>= March 30) ✅
    });

    it('should mark Feb 15 payment with explicit 90-day plan as ACTIVE', () => {
      const paymentDate = new Date('2026-02-15');
      
      const result = shouldBeActiveWithDuration(paymentDate, 90);
      
      expect(result).toBe(true);
      // Feb 15 + 90 days = May 16 (>= March 30) ✅
    });

    it('should mark Jan 15 payment with explicit 180-day plan as ACTIVE', () => {
      const paymentDate = new Date('2026-01-15');
      
      const result = shouldBeActiveWithDuration(paymentDate, 180);
      
      expect(result).toBe(true);
      // Jan 15 + 180 days = July 13 (>= March 30) ✅
    });

    it('should mark Jan 1 payment with explicit 180-day plan as ACTIVE', () => {
      const paymentDate = new Date('2026-01-01');
      
      const result = shouldBeActiveWithDuration(paymentDate, 180);
      
      expect(result).toBe(true);
      // Jan 1 + 180 days = June 29 (>= March 30) ✅
    });
  });

  describe('Old payments (should be EXPIRED)', () => {
    it('should mark December 2025 payment as EXPIRED', () => {
      const paymentDate = new Date('2025-12-15');
      const amount = 700;
      
      const result = shouldBeActive(paymentDate, amount);
      
      expect(result).toBe(false);
      // Dec 15 + 30 days = Jan 14 (< March 30) ❌
    });

    it('should mark November 2025 payment with 30-day inferred plan as EXPIRED', () => {
      const paymentDate = new Date('2025-11-01');
      const amount = 2099;
      
      // With new simplified inference, all amounts get 30-day plan
      const result = shouldBeActive(paymentDate, amount);
      
      expect(result).toBe(false);
      // Nov 1 + 30 days = Dec 1 (< March 30) ❌
    });
  });

  describe('Real-world scenarios (with new monthly default)', () => {
    it('should handle the case: paid in Feb, should be active in March (30-day)', () => {
      const febPayments = [
        { date: new Date('2026-02-28'), amount: 700 },
        { date: new Date('2026-02-27'), amount: 700 },
      ];

      const results = febPayments.map(p => ({
        date: p.date.toISOString().split('T')[0],
        amount: p.amount,
        shouldBeActive: shouldBeActive(p.date, p.amount),
      }));

      expect(results[0].shouldBeActive).toBe(true);  // Feb 28 + 30 = March 30 ✅
      expect(results[1].shouldBeActive).toBe(false); // Feb 27 + 30 = March 29 ❌
    });

    it('should handle the case: paid in March, definitely active', () => {
      const marchPayments = [
        { date: new Date('2026-03-01'), amount: 700 },
        { date: new Date('2026-03-15'), amount: 800 },
        { date: new Date('2026-03-30'), amount: 700 },
      ];

      const results = marchPayments.map(p => ({
        date: p.date.toISOString().split('T')[0],
        amount: p.amount,
        shouldBeActive: shouldBeActive(p.date, p.amount),
      }));

      results.forEach(r => {
        expect(r.shouldBeActive).toBe(true);
      });
    });

    it('should handle explicit multi-month plans with provided duration', () => {
      // For multi-month plans, planId must be explicitly provided
      const longTermPayments = [
        { date: new Date('2026-01-01'), duration: 180 }, // 6-month explicit
        { date: new Date('2026-02-01'), duration: 90 },  // 3-month explicit
        { date: new Date('2025-12-01'), duration: 180 }, // 6-month explicit
      ];

      const results = longTermPayments.map(p => ({
        date: p.date.toISOString().split('T')[0],
        duration: p.duration,
        shouldBeActive: shouldBeActiveWithDuration(p.date, p.duration),
      }));

      expect(results[0].shouldBeActive).toBe(true);  // Jan 1 + 180 = June 29 ✅
      expect(results[1].shouldBeActive).toBe(true);  // Feb 1 + 90 = May 2 ✅
      expect(results[2].shouldBeActive).toBe(true);  // Dec 1 + 180 = May 29 ✅
    });
  });

  describe('Edge cases that caused the bug', () => {
    it('should NOT mark member as active just because endDate is in future', () => {
      const veryOldPayment = new Date('2023-01-01');
      const amount = 700;
      
      const result = shouldBeActive(veryOldPayment, amount);
      
      expect(result).toBe(false);
      // 2023-01-01 + 30 days = 2023-01-31 (< 2026-03-30) ❌
    });

    it('should correctly calculate end date from payment date + duration', () => {
      // This is the correct logic that should be used
      const paymentDate = new Date('2026-03-01');
      const inferred = inferPlanFromAmount(700);
      
      const endDate = new Date(paymentDate);
      endDate.setDate(endDate.getDate() + inferred.durationDays);
      
      expect(inferred.durationDays).toBe(30);
      expect(endDate.toISOString().split('T')[0]).toBe('2026-03-31');
    });
  });

  describe('Plan inference always returns monthly', () => {
    it('should return monthly plan for any amount', () => {
      const amounts = [100, 500, 700, 1799, 2000, 2099, 5000];
      
      amounts.forEach(amount => {
        const result = inferPlanFromAmount(amount);
        expect(result.planId).toBe(DEFAULT_MONTHLY_PLAN_ID);
        expect(result.durationDays).toBe(30);
      });
    });
  });
});
