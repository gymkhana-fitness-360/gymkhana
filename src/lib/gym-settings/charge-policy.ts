import { prisma } from "@/lib/prisma";
import { gymKeyWhere } from "@/domains/platform/settings/service";
import {
  chargeAdmissionFeeKey,
  chargeDiscountPresetsKey,
  chargeTaxPercentKey,
} from "./keys";

export interface ChargePolicy {
  admissionFee: number;
  taxPercent: number;
  discountPresets: number[];
}

const DEFAULT_POLICY: ChargePolicy = {
  admissionFee: 0,
  taxPercent: 0,
  discountPresets: [],
};

async function readGymSetting(gymId: string, key: string): Promise<string | null> {
  const row = await prisma.setting.findUnique({
    where: gymKeyWhere(gymId, key),
  });
  return row?.value ?? null;
}

export async function getChargePolicy(gymId: string): Promise<ChargePolicy> {
  const [admissionRaw, taxRaw, presetsRaw] = await Promise.all([
    readGymSetting(gymId, chargeAdmissionFeeKey(gymId)),
    readGymSetting(gymId, chargeTaxPercentKey(gymId)),
    readGymSetting(gymId, chargeDiscountPresetsKey(gymId)),
  ]);

  const admissionFee = admissionRaw ? parseFloat(admissionRaw) : DEFAULT_POLICY.admissionFee;
  const taxPercent = taxRaw ? parseFloat(taxRaw) : DEFAULT_POLICY.taxPercent;

  let discountPresets: number[] = DEFAULT_POLICY.discountPresets;
  if (presetsRaw) {
    try {
      const parsed = JSON.parse(presetsRaw) as unknown;
      if (Array.isArray(parsed)) {
        discountPresets = parsed
          .map((v) => (typeof v === "number" ? v : parseFloat(String(v))))
          .filter((n) => Number.isFinite(n) && n >= 0);
      }
    } catch {
      discountPresets = presetsRaw
        .split(",")
        .map((s) => parseFloat(s.trim()))
        .filter((n) => Number.isFinite(n) && n >= 0);
    }
  }

  return {
    admissionFee: Number.isFinite(admissionFee) ? admissionFee : 0,
    taxPercent: Number.isFinite(taxPercent) ? taxPercent : 0,
    discountPresets,
  };
}

export interface ChargeBreakdown {
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
}

export function applyChargePolicy(
  subtotal: number,
  policy: ChargePolicy,
  discountAmount = 0
): ChargeBreakdown {
  const discount = Math.min(Math.max(discountAmount, 0), subtotal);
  const taxable = Math.max(subtotal - discount, 0);
  const tax = policy.taxPercent > 0 ? (taxable * policy.taxPercent) / 100 : 0;
  return {
    subtotal,
    tax: Math.round(tax * 100) / 100,
    discount,
    total: Math.round((taxable + tax) * 100) / 100,
  };
}
