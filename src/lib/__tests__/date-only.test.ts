/**
 * Tests for date-only utilities
 * Ensures IST timezone handling is correct and consistent
 */

import { todayIST, toDateOnlyIST, addDaysIST } from '../date-only';

describe('Date-only utilities', () => {
  describe('todayIST', () => {
    it('should return current date in IST with no time component', () => {
      const today = todayIST();
      
      expect(today).toBeInstanceOf(Date);
      expect(today.getUTCHours()).toBe(0);
      expect(today.getUTCMinutes()).toBe(0);
      expect(today.getUTCSeconds()).toBe(0);
      expect(today.getUTCMilliseconds()).toBe(0);
    });

    it('should return consistent date when called multiple times in same day', () => {
      const date1 = todayIST();
      const date2 = todayIST();
      
      expect(date1.getTime()).toBe(date2.getTime());
    });
  });

  describe('toDateOnlyIST', () => {
    it('should strip time component from Date object', () => {
      const input = new Date('2026-03-15T14:30:45.123Z');
      const result = toDateOnlyIST(input);
      
      expect(result.getUTCHours()).toBe(0);
      expect(result.getUTCMinutes()).toBe(0);
      expect(result.getUTCSeconds()).toBe(0);
      expect(result.getUTCMilliseconds()).toBe(0);
    });

    it('should parse ISO date string correctly', () => {
      const result = toDateOnlyIST('2026-03-15');
      
      expect(result.getUTCFullYear()).toBe(2026);
      expect(result.getUTCMonth()).toBe(2); // March (0-indexed)
      expect(result.getUTCDate()).toBe(15);
      expect(result.getUTCHours()).toBe(0);
    });

    it('should parse ISO datetime string correctly', () => {
      const result = toDateOnlyIST('2026-03-15T14:30:45Z');
      
      expect(result.getUTCFullYear()).toBe(2026);
      expect(result.getUTCMonth()).toBe(2);
      expect(result.getUTCDate()).toBe(15);
      expect(result.getUTCHours()).toBe(0);
    });

    it('should handle dates near midnight IST correctly', () => {
      // 2026-03-15 23:59 IST = 2026-03-15 18:29 UTC
      const input = new Date('2026-03-15T18:29:00Z');
      const result = toDateOnlyIST(input);
      
      // Should still be March 15 in IST
      expect(result.getUTCFullYear()).toBe(2026);
      expect(result.getUTCMonth()).toBe(2);
      expect(result.getUTCDate()).toBe(15);
    });

    it('should handle dates that cross day boundary in UTC', () => {
      // 2026-03-16 00:30 IST = 2026-03-15 19:00 UTC
      const input = new Date('2026-03-15T19:00:00Z');
      const result = toDateOnlyIST(input);
      
      // Should be March 16 in IST (next day)
      expect(result.getUTCFullYear()).toBe(2026);
      expect(result.getUTCMonth()).toBe(2);
      expect(result.getUTCDate()).toBe(16);
    });

    it('should be idempotent', () => {
      const input = new Date('2026-03-15T14:30:45Z');
      const result1 = toDateOnlyIST(input);
      const result2 = toDateOnlyIST(result1);
      
      expect(result1.getTime()).toBe(result2.getTime());
    });
  });

  describe('addDaysIST', () => {
    it('should add days correctly', () => {
      const start = toDateOnlyIST('2026-03-15');
      const result = addDaysIST(start, 5);
      
      expect(result.getUTCFullYear()).toBe(2026);
      expect(result.getUTCMonth()).toBe(2);
      expect(result.getUTCDate()).toBe(20);
    });

    it('should handle month boundaries', () => {
      const start = toDateOnlyIST('2026-03-30');
      const result = addDaysIST(start, 5);
      
      expect(result.getUTCFullYear()).toBe(2026);
      expect(result.getUTCMonth()).toBe(3); // April
      expect(result.getUTCDate()).toBe(4);
    });

    it('should handle year boundaries', () => {
      const start = toDateOnlyIST('2026-12-30');
      const result = addDaysIST(start, 5);
      
      expect(result.getUTCFullYear()).toBe(2027);
      expect(result.getUTCMonth()).toBe(0); // January
      expect(result.getUTCDate()).toBe(4);
    });

    it('should handle negative days (subtract)', () => {
      const start = toDateOnlyIST('2026-03-15');
      const result = addDaysIST(start, -5);
      
      expect(result.getUTCFullYear()).toBe(2026);
      expect(result.getUTCMonth()).toBe(2);
      expect(result.getUTCDate()).toBe(10);
    });

    it('should handle zero days', () => {
      const start = toDateOnlyIST('2026-03-15');
      const result = addDaysIST(start, 0);
      
      expect(result.getTime()).toBe(start.getTime());
    });

    it('should preserve date-only format (no time component)', () => {
      const start = toDateOnlyIST('2026-03-15');
      const result = addDaysIST(start, 10);
      
      expect(result.getUTCHours()).toBe(0);
      expect(result.getUTCMinutes()).toBe(0);
      expect(result.getUTCSeconds()).toBe(0);
      expect(result.getUTCMilliseconds()).toBe(0);
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle membership renewal calculation', () => {
      // Member joins on March 15, 2026 with 30-day membership
      const joinDate = toDateOnlyIST('2026-03-15');
      const endDate = addDaysIST(joinDate, 30 - 1); // 29 days added
      const nextRenewalDate = addDaysIST(endDate, 1);
      
      expect(endDate.getUTCDate()).toBe(13); // April 13
      expect(endDate.getUTCMonth()).toBe(3); // April
      expect(nextRenewalDate.getUTCDate()).toBe(14); // April 14
    });

    it('should handle payment date from WhatsApp import', () => {
      // Payment received "today" should use IST date
      const paymentDate = todayIST();
      const stored = toDateOnlyIST(paymentDate);
      
      expect(stored.getTime()).toBe(paymentDate.getTime());
    });

    it('should handle date comparison for overdue checking', () => {
      const today = todayIST();
      const expired = addDaysIST(today, -5); // 5 days ago
      const future = addDaysIST(today, 5); // 5 days from now
      
      expect(expired.getTime()).toBeLessThan(today.getTime());
      expect(future.getTime()).toBeGreaterThan(today.getTime());
    });
  });

  describe('Edge cases', () => {
    it('should handle leap year dates', () => {
      const leapDay = toDateOnlyIST('2024-02-29');
      const nextDay = addDaysIST(leapDay, 1);
      
      expect(nextDay.getUTCMonth()).toBe(2); // March
      expect(nextDay.getUTCDate()).toBe(1);
    });

    it('should handle DST transitions (IST has no DST)', () => {
      // IST doesn't observe DST, so this should be straightforward
      const beforeDST = toDateOnlyIST('2026-03-08');
      const afterDST = toDateOnlyIST('2026-03-15');
      
      const diff = (afterDST.getTime() - beforeDST.getTime()) / (1000 * 60 * 60 * 24);
      expect(diff).toBe(7); // Exactly 7 days
    });

    it('should handle very old dates', () => {
      const oldDate = toDateOnlyIST('2020-01-01');
      
      expect(oldDate.getUTCFullYear()).toBe(2020);
      expect(oldDate.getUTCMonth()).toBe(0);
      expect(oldDate.getUTCDate()).toBe(1);
    });

    it('should handle far future dates', () => {
      const futureDate = toDateOnlyIST('2030-12-31');
      
      expect(futureDate.getUTCFullYear()).toBe(2030);
      expect(futureDate.getUTCMonth()).toBe(11);
      expect(futureDate.getUTCDate()).toBe(31);
    });
  });
});
