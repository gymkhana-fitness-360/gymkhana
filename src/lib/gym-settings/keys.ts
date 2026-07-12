/** Gym-scoped Setting keys (suffix `:gymId`). */

export function memberCodePrefixKey(gymId: string) {
  return `member_code_prefix:${gymId}`;
}

export function memberCodeSequenceKey(gymId: string) {
  return `member_code_sequence:${gymId}`;
}

export function billCodePrefixKey(gymId: string) {
  return `bill_code_prefix:${gymId}`;
}

export function billCodeSequenceKey(gymId: string) {
  return `bill_code_sequence:${gymId}`;
}

export function chargeAdmissionFeeKey(gymId: string) {
  return `charge_admission_fee:${gymId}`;
}

export function chargeTaxPercentKey(gymId: string) {
  return `charge_tax_percent:${gymId}`;
}

export function chargeDiscountPresetsKey(gymId: string) {
  return `charge_discount_presets:${gymId}`;
}

export const DEFAULT_MEMBER_PREFIX = "MEM-";
export const DEFAULT_BILL_PREFIX = "GK-";
