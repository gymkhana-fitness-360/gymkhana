"use client";

import { formatCurrency } from "@/lib/utils";

export type SupplementInvoiceView = {
  invoiceNumber: string;
  issuedAt: string | null;
  buyerName: string | null;
  buyerPhone: string | null;
  buyerGstin: string | null;
  taxableTotalInr: number;
  cgstTotalInr: number;
  sgstTotalInr: number;
  igstTotalInr: number;
  grandTotalInr: number;
  placeOfSupplyState: string | null;
  notes: string | null;
  seller: {
    name: string;
    legalName: string | null;
    gstin: string | null;
    address: string | null;
    phone: string | null;
    stateCode: string | null;
  };
  lines: Array<{
    description: string;
    hsnCode: string;
    quantity: number;
    unitPriceInr: number;
    gstRatePercent: number;
    taxableValueInr: number;
    cgstInr: number;
    sgstInr: number;
    lineTotalInr: number;
  }>;
};

export function SupplementGstInvoiceTemplate({
  invoice,
}: {
  invoice: SupplementInvoiceView;
}) {
  const sellerName = invoice.seller.legalName ?? invoice.seller.name;

  return (
    <div className="max-w-2xl mx-auto p-6 text-sm text-foreground print:p-4">
      <header className="border-b pb-4 mb-4">
        <h1 className="text-lg font-bold">Tax Invoice — Supplements</h1>
        <p className="font-semibold mt-2">{sellerName}</p>
        {invoice.seller.gstin && (
          <p>GSTIN: {invoice.seller.gstin}</p>
        )}
        {invoice.seller.address && <p>{invoice.seller.address}</p>}
        {invoice.seller.phone && <p>Phone: {invoice.seller.phone}</p>}
      </header>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-muted-foreground text-xs">Invoice No.</p>
          <p className="font-mono font-medium">{invoice.invoiceNumber}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Date</p>
          <p>
            {invoice.issuedAt
              ? new Date(invoice.issuedAt).toLocaleDateString("en-IN")
              : "—"}
          </p>
        </div>
        {invoice.buyerName && (
          <div className="col-span-2">
            <p className="text-muted-foreground text-xs">Buyer</p>
            <p>
              {invoice.buyerName}
              {invoice.buyerPhone ? ` · ${invoice.buyerPhone}` : ""}
            </p>
            {invoice.buyerGstin && <p>GSTIN: {invoice.buyerGstin}</p>}
          </div>
        )}
        {invoice.placeOfSupplyState && (
          <div>
            <p className="text-muted-foreground text-xs">Place of supply</p>
            <p>State {invoice.placeOfSupplyState}</p>
          </div>
        )}
      </div>

      <table className="w-full border text-xs mb-4">
        <thead>
          <tr className="bg-muted/50">
            <th className="p-2 text-left">Item</th>
            <th className="p-2">HSN</th>
            <th className="p-2">Qty</th>
            <th className="p-2 text-right">Taxable</th>
            <th className="p-2 text-right">CGST</th>
            <th className="p-2 text-right">SGST</th>
            <th className="p-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((line, i) => (
            <tr key={i} className="border-t">
              <td className="p-2">
                {line.description}
                <span className="text-muted-foreground block">
                  @{line.gstRatePercent}% GST
                </span>
              </td>
              <td className="p-2 text-center">{line.hsnCode}</td>
              <td className="p-2 text-center">{line.quantity}</td>
              <td className="p-2 text-right">
                {formatCurrency(line.taxableValueInr)}
              </td>
              <td className="p-2 text-right">{formatCurrency(line.cgstInr)}</td>
              <td className="p-2 text-right">{formatCurrency(line.sgstInr)}</td>
              <td className="p-2 text-right font-medium">
                {formatCurrency(line.lineTotalInr)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t pt-3 space-y-1 text-right">
        <p>Taxable: {formatCurrency(invoice.taxableTotalInr)}</p>
        <p>CGST: {formatCurrency(invoice.cgstTotalInr)}</p>
        <p>SGST: {formatCurrency(invoice.sgstTotalInr)}</p>
        {invoice.igstTotalInr > 0 && (
          <p>IGST: {formatCurrency(invoice.igstTotalInr)}</p>
        )}
        <p className="text-base font-bold">
          Grand total: {formatCurrency(invoice.grandTotalInr)}
        </p>
      </div>

      {invoice.notes && (
        <p className="mt-4 text-xs text-muted-foreground">{invoice.notes}</p>
      )}

      <p className="mt-6 text-[10px] text-muted-foreground">
        Computer-generated GST invoice. For inter-state supplies, configure IGST in a future release.
      </p>
    </div>
  );
}
