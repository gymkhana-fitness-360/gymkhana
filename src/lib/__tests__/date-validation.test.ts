/**
 * Tests for date validation utilities
 */

import {
  validateDateOnly,
  hasTimeComponent,
  validateDateOnlySoft,
  validateDateValue,
  validateDateRange,
} from '../date-validation';
import { toDateOnlyIST } from '../date-only';

describe('Date validation utilities', () => {
  describe('validateDateOnly', () => {
    it('should pass for date-only values', () => {
      const dateOnly = new Date(Date.UTC(2026, 2, 15, 0, 0, 0, 0));
      
      expect(() => validateDateOnly(dateOnly)).not.toThrow();
    });

    it('should throw for dates with time component', () => {
      const withTime = new Date(Date.UTC(2026, 2, 15, 14, 30, 0, 0));
      
      expect(() => validateDateOnly(withTime)).toThrow('has time component');
    });

    it('should include field name in error message', () => {
      const withTime = new Date(Date.UTC(2026, 2, 15, 14, 30, 0, 0));
      
      expect(() => validateDateOnly(withTime, 'receivedAt')).toThrow("field 'receivedAt'");
    });

    it('should detect milliseconds', () => {
      const withMs = new Date(Date.UTC(2026, 2, 15, 0, 0, 0, 123));
      
      expect(() => validateDateOnly(withMs)).toThrow();
    });
  });

  describe('hasTimeComponent', () => {
    it('should return false for date-only values', () => {
      const dateOnly = new Date(Date.UTC(2026, 2, 15, 0, 0, 0, 0));
      
      expect(hasTimeComponent(dateOnly)).toBe(false);
    });

    it('should return true for dates with hours', () => {
      const withTime = new Date(Date.UTC(2026, 2, 15, 14, 0, 0, 0));
      
      expect(hasTimeComponent(withTime)).toBe(true);
    });

    it('should return true for dates with minutes', () => {
      const withTime = new Date(Date.UTC(2026, 2, 15, 0, 30, 0, 0));
      
      expect(hasTimeComponent(withTime)).toBe(true);
    });

    it('should return true for dates with seconds', () => {
      const withTime = new Date(Date.UTC(2026, 2, 15, 0, 0, 45, 0));
      
      expect(hasTimeComponent(withTime)).toBe(true);
    });

    it('should return true for dates with milliseconds', () => {
      const withTime = new Date(Date.UTC(2026, 2, 15, 0, 0, 0, 123));
      
      expect(hasTimeComponent(withTime)).toBe(true);
    });
  });

  describe('validateDateOnlySoft', () => {
    it('should not throw for date-only values', () => {
      const dateOnly = new Date(Date.UTC(2026, 2, 15, 0, 0, 0, 0));
      
      expect(() => validateDateOnlySoft(dateOnly)).not.toThrow();
    });

    it('should not throw for dates with time (soft validation)', () => {
      const withTime = new Date(Date.UTC(2026, 2, 15, 14, 30, 0, 0));
      
      // Should log warning but not throw
      expect(() => validateDateOnlySoft(withTime)).not.toThrow();
    });
  });

  describe('validateDateValue', () => {
    it('should pass for valid dates', () => {
      const validDate = new Date('2026-03-15');
      
      expect(() => validateDateValue(validDate)).not.toThrow();
    });

    it('should throw for invalid dates', () => {
      const invalidDate = new Date('invalid');
      
      expect(() => validateDateValue(invalidDate)).toThrow('Invalid date');
    });

    it('should throw for NaN dates', () => {
      const nanDate = new Date(NaN);
      
      expect(() => validateDateValue(nanDate)).toThrow('Invalid date');
    });

    it('should throw for Infinity', () => {
      const infDate = new Date(Infinity);
      
      // new Date(Infinity) creates Invalid Date, so it throws "Invalid date" not "Infinity"
      expect(() => validateDateValue(infDate)).toThrow('Invalid date');
    });

    it('should include field name in error message', () => {
      const invalidDate = new Date('invalid');
      
      expect(() => validateDateValue(invalidDate, 'paymentDate')).toThrow("'paymentDate'");
    });
  });

  describe('validateDateRange', () => {
    it('should pass for valid range', () => {
      const start = toDateOnlyIST('2026-03-15');
      const end = toDateOnlyIST('2026-03-20');
      
      expect(() => validateDateRange(start, end)).not.toThrow();
    });

    it('should pass for equal dates', () => {
      const date = toDateOnlyIST('2026-03-15');
      
      expect(() => validateDateRange(date, date)).not.toThrow();
    });

    it('should throw when start is after end', () => {
      const start = toDateOnlyIST('2026-03-20');
      const end = toDateOnlyIST('2026-03-15');
      
      expect(() => validateDateRange(start, end)).toThrow('must be before or equal to');
    });

    it('should include field names in error message', () => {
      const start = toDateOnlyIST('2026-03-20');
      const end = toDateOnlyIST('2026-03-15');
      
      expect(() => 
        validateDateRange(start, end, { start: 'startDate', end: 'endDate' })
      ).toThrow('startDate must be before or equal to endDate');
    });

    it('should validate both dates are valid', () => {
      const start = new Date('invalid');
      const end = toDateOnlyIST('2026-03-15');
      
      expect(() => validateDateRange(start, end)).toThrow('Invalid date');
    });
  });

  describe('Integration with toDateOnlyIST', () => {
    it('should pass validation after toDateOnlyIST conversion', () => {
      const input = new Date('2026-03-15T14:30:45Z');
      const dateOnly = toDateOnlyIST(input);
      
      expect(() => validateDateOnly(dateOnly)).not.toThrow();
      expect(hasTimeComponent(dateOnly)).toBe(false);
    });

    it('should validate date range after conversion', () => {
      const start = toDateOnlyIST('2026-03-15T14:30:00Z');
      const end = toDateOnlyIST('2026-03-20T08:15:00Z');
      
      expect(() => validateDateRange(start, end)).not.toThrow();
    });
  });
});
