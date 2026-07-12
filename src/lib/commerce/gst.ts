/** India GST line math for supplement invoices (intra-state CGST+SGST). */

export type GstLineInput = {
  quantity: number;
  unitPriceInr: number;
  gstRatePercent: number;
  priceIncludesGst: boolean;
};

export type GstLineBreakdown = {
  taxableValueInr: number;
  cgstInr: number;
  sgstInr: number;
  igstInr: number;
  lineTotalInr: number;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeGstLine(input: GstLineInput): GstLineBreakdown {
  const qty = Math.max(1, input.quantity);
  const rate = Math.max(0, input.gstRatePercent) / 100;
  const unit = input.unitPriceInr;

  let taxablePerUnit: number;
  let taxPerUnit: number;

  if (input.priceIncludesGst && rate > 0) {
    taxablePerUnit = unit / (1 + rate);
    taxPerUnit = unit - taxablePerUnit;
  } else {
    taxablePerUnit = unit;
    taxPerUnit = taxablePerUnit * rate;
  }

  const taxableValueInr = round2(taxablePerUnit * qty);
  const totalTax = round2(taxPerUnit * qty);
  const cgstInr = round2(totalTax / 2);
  const sgstInr = round2(totalTax - cgstInr);
  const lineTotalInr = round2(taxableValueInr + cgstInr + sgstInr);

  return {
    taxableValueInr,
    cgstInr,
    sgstInr,
    igstInr: 0,
    lineTotalInr,
  };
}

export function sumInvoiceLines(lines: GstLineBreakdown[]) {
  const taxableTotalInr = round2(
    lines.reduce((s, l) => s + l.taxableValueInr, 0),
  );
  const cgstTotalInr = round2(lines.reduce((s, l) => s + l.cgstInr, 0));
  const sgstTotalInr = round2(lines.reduce((s, l) => s + l.sgstInr, 0));
  const igstTotalInr = round2(lines.reduce((s, l) => s + l.igstInr, 0));
  const grandTotalInr = round2(
    taxableTotalInr + cgstTotalInr + sgstTotalInr + igstTotalInr,
  );
  return {
    taxableTotalInr,
    cgstTotalInr,
    sgstTotalInr,
    igstTotalInr,
    grandTotalInr,
  };
}

/** Common HSN for gym supplements (staff can override per SKU). */
export const DEFAULT_SUPPLEMENT_HSN = "21069099";

export function validateHsnCode(hsn: string | null | undefined): boolean {
  if (!hsn) return false;
  return /^\d{4,8}$/.test(hsn.trim());
}

export function validateGstin(gstin: string | null | undefined): boolean {
  if (!gstin) return false;
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
    gstin.trim().toUpperCase(),
  );
}
