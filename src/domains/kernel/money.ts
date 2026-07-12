/**
 * Currency helpers — amounts stored/processed as INR rupees in most flows.
 */

export const INR_DECIMAL_PLACES = 2;

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/** Round to 2 decimal places for display or comparison tolerance */
export function roundInr(rupees: number): number {
  return Math.round(rupees * 100) / 100;
}
