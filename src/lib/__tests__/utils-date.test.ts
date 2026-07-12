/**
 * Tests for date utility functions in utils.ts
 */

import { formatDate, getDaysUntil, formatCurrency } from '../utils';
import { toDateOnlyIST, todayIST, addDaysIST } from '../date-only';

describe('Date utility functions', () => {
  describe('formatDate', () => {
    it('should format Date object correctly', () => {
      const date = new Date('2026-03-15T00:00:00Z');
      const formatted = formatDate(date);
      
      // Should be in format "15 Mar 2026" (IST)
      expect(formatted).toMatch(/\d{2} \w{3} \d{4}/);
    });

    it('should format ISO string correctly', () => {
      const formatted = formatDate('2026-03-15');
      
      expect(formatted).toMatch(/\d{2} \w{3} \d{4}/);
    });

    it('should handle dates with time component', () => {
      const date = new Date('2026-03-15T14:30:45Z');
      const formatted = formatDate(date);
      
      // Should still format as date only (no time shown)
      expect(formatted).toMatch(/\d{2} \w{3} \d{4}/);
      expect(formatted).not.toContain(':');
    });

    it('should use IST timezone', () => {
      // 2026-03-15 19:00 UTC = 2026-03-16 00:30 IST (next day)
      const date = new Date('2026-03-15T19:00:00Z');
      const formatted = formatDate(date);
      
      // Should show March 16 (IST date)
      expect(formatted).toContain('16');
    });
  });

  describe('getDaysUntil', () => {
    it('should calculate days until future date', () => {
      const today = todayIST();
      const future = addDaysIST(today, 5);
      
      const days = getDaysUntil(future);
      
      expect(days).toBe(5);
    });

    it('should return negative for past dates', () => {
      const today = todayIST();
      const past = addDaysIST(today, -5);
      
      const days = getDaysUntil(past);
      
      expect(days).toBe(-5);
    });

    it('should return 0 for today', () => {
      const today = todayIST();
      
      const days = getDaysUntil(today);
      
      expect(days).toBe(0);
    });

    it('should handle ISO string input', () => {
      const today = todayIST();
      const futureDate = addDaysIST(today, 10);
      const isoString = futureDate.toISOString().split('T')[0];
      
      const days = getDaysUntil(isoString);
      
      expect(days).toBeCloseTo(10, 0);
    });

    it('should use IST timezone for calculation', () => {
      // This ensures we're comparing IST dates, not UTC
      const today = todayIST();
      const tomorrow = addDaysIST(today, 1);
      
      const days = getDaysUntil(tomorrow);
      
      expect(days).toBe(1);
    });

    it('should handle dates near midnight correctly', () => {
      // 2026-03-15 23:59 IST should be same day as 2026-03-15 00:01 IST
      const date1 = toDateOnlyIST('2026-03-15T18:31:00Z'); // 00:01 IST
      const date2 = toDateOnlyIST('2026-03-15T18:29:00Z'); // 23:59 IST previous day
      
      // Both should normalize to same date
      expect(date1.getTime()).toBe(date2.getTime());
    });
  });

  describe('formatCurrency', () => {
    it('should format normal amounts', () => {
      expect(formatCurrency(1000)).toBe('₹1,000');
      expect(formatCurrency(2500)).toBe('₹2,500');
    });

    it('should handle Infinity', () => {
      expect(formatCurrency(Infinity)).toBe('₹0');
      expect(formatCurrency(-Infinity)).toBe('₹0');
    });

    it('should handle NaN', () => {
      expect(formatCurrency(NaN)).toBe('₹0');
    });

    it('should handle null/undefined', () => {
      expect(formatCurrency(null as unknown as number)).toBe('₹0');
      expect(formatCurrency(undefined as unknown as number)).toBe('₹0');
    });

    it('should handle string input', () => {
      expect(formatCurrency('1000')).toBe('₹1,000');
      expect(formatCurrency('invalid')).toBe('₹0');
    });

    it('should handle decimal amounts', () => {
      expect(formatCurrency(1000.50)).toBe('₹1,000.5');
      expect(formatCurrency(1000.00)).toBe('₹1,000');
    });
  });

  describe('Real-world date scenarios', () => {
    it('should calculate overdue days correctly', () => {
      const today = todayIST();
      const expiredDate = addDaysIST(today, -10);
      
      const daysOverdue = Math.abs(getDaysUntil(expiredDate));
      
      expect(daysOverdue).toBe(10);
    });

    it('should calculate days until renewal', () => {
      const today = todayIST();
      const renewalDate = addDaysIST(today, 15);
      
      const daysUntilRenewal = getDaysUntil(renewalDate);
      
      expect(daysUntilRenewal).toBe(15);
    });

    it('should format payment date for display', () => {
      const paymentDate = toDateOnlyIST('2026-03-15');
      const formatted = formatDate(paymentDate);
      
      expect(formatted).toMatch(/15 Mar 2026/);
    });
  });
});
