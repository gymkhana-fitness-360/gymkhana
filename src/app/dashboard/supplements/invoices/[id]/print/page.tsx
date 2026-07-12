"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { SupplementGstInvoiceTemplate } from "@/components/commerce/SupplementGstInvoiceTemplate";
import type { SupplementInvoiceView } from "@/components/commerce/SupplementGstInvoiceTemplate";
import { Loader2 } from "lucide-react";

export default function PrintSupplementInvoicePage() {
  const params = useParams();
  const id = params.id as string;
  const [invoice, setInvoice] = useState<SupplementInvoiceView | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/commerce/invoices/${id}`)
      .then((r) => r.json())
      .then((j) => {
        const inv = j.data?.invoice ?? j.invoice;
        if (!inv) return;
        setInvoice({
          invoiceNumber: inv.invoiceNumber,
          issuedAt: inv.issuedAt,
          buyerName: inv.buyerName,
          buyerPhone: inv.buyerPhone,
          buyerGstin: inv.buyerGstin,
          taxableTotalInr: Number(inv.taxableTotalInr),
          cgstTotalInr: Number(inv.cgstTotalInr),
          sgstTotalInr: Number(inv.sgstTotalInr),
          igstTotalInr: Number(inv.igstTotalInr),
          grandTotalInr: Number(inv.grandTotalInr),
          placeOfSupplyState: inv.placeOfSupplyState,
          notes: inv.notes,
          seller: {
            name: inv.Gym.name,
            legalName: inv.Gym.invoiceLegalName,
            gstin: inv.Gym.gstin,
            address: inv.Gym.address,
            phone: inv.Gym.phone,
            stateCode: inv.Gym.invoiceStateCode,
          },
          lines: inv.Lines.map(
            (l: {
              description: string;
              hsnCode: string;
              quantity: number;
              unitPriceInr: string | number;
              gstRatePercent: string | number;
              taxableValueInr: string | number;
              cgstInr: string | number;
              sgstInr: string | number;
              lineTotalInr: string | number;
            }) => ({
              description: l.description,
              hsnCode: l.hsnCode,
              quantity: l.quantity,
              unitPriceInr: Number(l.unitPriceInr),
              gstRatePercent: Number(l.gstRatePercent),
              taxableValueInr: Number(l.taxableValueInr),
              cgstInr: Number(l.cgstInr),
              sgstInr: Number(l.sgstInr),
              lineTotalInr: Number(l.lineTotalInr),
            }),
          ),
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (invoice && !loading) {
      setTimeout(() => window.print(), 500);
    }
  }, [invoice, loading]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!invoice) {
    return <p className="p-6 text-center">Invoice not found</p>;
  }

  return <SupplementGstInvoiceTemplate invoice={invoice} />;
}
