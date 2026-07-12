/**
 * PLAN INFERENCE TESTS
 * 
 * Tests the simplified plan inference logic.
 * Business decision: Default to "monthly" plan (30 days) for all payments.
 * The monthly plan is generic and can accept any payment amount.
 */

import { inferPlanFromAmount, DEFAULT_MONTHLY_PLAN_ID } from '../plan-inference';

describe('Plan Inference', () => {
  describe('Default monthly plan', () => {
    it('should return monthly plan for any amount', () => {
      const amounts = [100, 500, 699, 700, 799, 1000, 1500, 1799, 1800, 2000, 2099, 2500, 3000];
      
      amounts.forEach(amount => {
        const result = inferPlanFromAmount(amount);
        expect(result.planId).toBe(DEFAULT_MONTHLY_PLAN_ID);
        expect(result.durationDays).toBe(30);
        expect(result.confidence).toBe('approximate');
      });
    });

    it('should use "monthly" as the default plan ID', () => {
      expect(DEFAULT_MONTHLY_PLAN_ID).toBe('monthly');
    });
  });

  describe('Return structure', () => {
    it('should return planId, durationDays, and confidence', () => {
      const result = inferPlanFromAmount(1000);
      
      expect(result).toHaveProperty('planId');
      expect(result).toHaveProperty('durationDays');
      expect(result).toHaveProperty('confidence');
    });

    it('should always return 30 days duration', () => {
      const result = inferPlanFromAmount(5000);
      expect(result.durationDays).toBe(30);
    });

    it('should always return "approximate" confidence', () => {
      const result = inferPlanFromAmount(2099);
      expect(result.confidence).toBe('approximate');
    });
  });

  describe('Edge cases', () => {
    it('should handle zero amount', () => {
      const result = inferPlanFromAmount(0);
      expect(result.planId).toBe(DEFAULT_MONTHLY_PLAN_ID);
      expect(result.durationDays).toBe(30);
    });

    it('should handle negative amount', () => {
      const result = inferPlanFromAmount(-100);
      expect(result.planId).toBe(DEFAULT_MONTHLY_PLAN_ID);
      expect(result.durationDays).toBe(30);
    });

    it('should handle very large amounts', () => {
      const result = inferPlanFromAmount(100000);
      expect(result.planId).toBe(DEFAULT_MONTHLY_PLAN_ID);
      expect(result.durationDays).toBe(30);
    });

    it('should handle decimal amounts', () => {
      const result = inferPlanFromAmount(799.50);
      expect(result.planId).toBe(DEFAULT_MONTHLY_PLAN_ID);
      expect(result.durationDays).toBe(30);
    });
  });
});
