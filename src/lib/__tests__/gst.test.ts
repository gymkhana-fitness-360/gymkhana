import {
  computeGstLine,
  sumInvoiceLines,
  validateGstin,
  validateHsnCode,
} from "@/lib/commerce/gst";

describe("GST line computation", () => {
  it("splits inclusive 18% into taxable + CGST/SGST", () => {
    const line = computeGstLine({
      quantity: 1,
      unitPriceInr: 118,
      gstRatePercent: 18,
      priceIncludesGst: true,
    });
    expect(line.taxableValueInr).toBe(100);
    expect(line.cgstInr).toBe(9);
    expect(line.sgstInr).toBe(9);
    expect(line.lineTotalInr).toBe(118);
  });

  it("sums invoice totals", () => {
    const a = computeGstLine({
      quantity: 2,
      unitPriceInr: 100,
      gstRatePercent: 18,
      priceIncludesGst: false,
    });
    const totals = sumInvoiceLines([a]);
    expect(totals.grandTotalInr).toBeGreaterThan(200);
  });
});

describe("validators", () => {
  it("validates HSN", () => {
    expect(validateHsnCode("21069099")).toBe(true);
    expect(validateHsnCode("abc")).toBe(false);
  });

  it("validates GSTIN format", () => {
    expect(validateGstin("19AABCU9603R1ZM")).toBe(true);
    expect(validateGstin("invalid")).toBe(false);
  });
});
