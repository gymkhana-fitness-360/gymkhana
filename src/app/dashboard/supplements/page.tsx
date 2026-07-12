"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  Package,
  FileText,
  ExternalLink,
  Loader2,
  Plus,
} from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { DEFAULT_SUPPLEMENT_HSN } from "@/lib/commerce/gst";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("fetch failed");
    return r.json();
  });

type Product = {
  id: string;
  name: string;
  priceInr: string | number;
  hsnCode: string | null;
  gstRatePercent: string | number;
  amazonReferenceUrl: string | null;
};

type OrderLine = {
  id: string;
  quantity: number;
  unitPriceInr: string | number;
  Product: { name: string };
  Member: { name: string } | null;
};

export default function SupplementsPage() {
  const { data: productsData, mutate: mutateProducts } = useSWR<{ products: Product[] }>(
    "/api/commerce/products",
    fetcher,
  );
  const { data: linesData, mutate: mutateLines } = useSWR<{ lines: OrderLine[] }>(
    "/api/commerce/order-lines?pending=1",
    fetcher,
  );
  const { data: gstData, mutate: mutateGst } = useSWR(
    "/api/commerce/gym-gst",
    fetcher,
  );
  const { data: invoicesData } = useSWR("/api/commerce/invoices", fetcher);

  const [gstin, setGstin] = useState("");
  const [legalName, setLegalName] = useState("");
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newHsn, setNewHsn] = useState(DEFAULT_SUPPLEMENT_HSN);
  const [refUrl, setRefUrl] = useState<Record<string, string>>({});
  const [selectedLines, setSelectedLines] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const products = productsData?.products?.filter(
    (p) => true,
  ) ?? [];
  const lines = linesData?.lines ?? [];
  const gymGst = gstData?.data?.gym ?? gstData?.gym;

  const saveGst = async () => {
    setBusy(true);
    try {
      await fetch("/api/commerce/gym-gst", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gstin,
          invoiceLegalName: legalName,
        }),
      });
      await mutateGst();
    } finally {
      setBusy(false);
    }
  };

  const addProduct = async () => {
    if (!newName || !newPrice) return;
    setBusy(true);
    try {
      await fetch("/api/commerce/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          category: "SUPPLEMENT",
          priceInr: Number(newPrice),
          hsnCode: newHsn,
          gstRatePercent: 18,
          priceIncludesGst: true,
        }),
      });
      setNewName("");
      setNewPrice("");
      await mutateProducts();
    } finally {
      setBusy(false);
    }
  };

  const saveReference = async (productId: string) => {
    const url = refUrl[productId]?.trim();
    setBusy(true);
    try {
      await fetch(`/api/commerce/products/${productId}/marketplace-reference`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referenceUrl: url || null,
        }),
      });
      await mutateProducts();
    } finally {
      setBusy(false);
    }
  };

  const issueInvoice = async () => {
    const ids = [...selectedLines];
    if (ids.length === 0) return;
    setBusy(true);
    try {
      const res = await fetch("/api/commerce/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderLineIds: ids, issue: true }),
      });
      const json = await res.json();
      if (res.ok) {
        const invId = json.data?.invoice?.id ?? json.invoice?.id;
        setSelectedLines(new Set());
        await mutateLines();
        if (invId) {
          window.open(`/dashboard/supplements/invoices/${invId}/print`, "_blank");
        }
      } else {
        alert(json.error?.message ?? "Could not issue invoice");
      }
    } finally {
      setBusy(false);
    }
  };

  const toggleLine = (id: string) => {
    setSelectedLines((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Supplements"
        description="GST tax invoices (HSN), pending orders, and staff-entered product reference links."
      />

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="pt-4 text-sm text-muted-foreground">
          <strong className="text-foreground">Compliance:</strong> Fitness360 does not
          scrape Amazon or display price comparisons. Paste an Amazon.in URL only
          after your staff verify the listing. Members see the same link in the
          member app when they open a product — not automatic price checks.
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Seller GST (required for invoices)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="GSTIN (15 chars)"
            value={gstin || gymGst?.gstin || ""}
            onChange={(e) => setGstin(e.target.value)}
            className="font-mono"
          />
          <Input
            placeholder="Legal name on invoice"
            value={legalName || gymGst?.invoiceLegalName || ""}
            onChange={(e) => setLegalName(e.target.value)}
            className="flex-1"
          />
          <Button onClick={saveGst} disabled={busy}>
            Save
          </Button>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Catalog (HSN + GST %)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="Product name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Input
                placeholder="Price ₹ (incl. GST)"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                className="w-28"
              />
              <Input
                placeholder="HSN"
                value={newHsn}
                onChange={(e) => setNewHsn(e.target.value)}
                className="w-28 font-mono"
              />
              <Button size="sm" onClick={addProduct} disabled={busy}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <ul className="space-y-3 max-h-96 overflow-y-auto">
              {products.map((p) => (
                <li key={p.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">{p.name}</span>
                    <span>{formatCurrency(Number(p.priceInr))}</span>
                  </div>
                  <div className="flex gap-2 flex-wrap text-xs">
                    <Badge variant="outline">HSN {p.hsnCode ?? "—"}</Badge>
                    <Badge variant="secondary">
                      GST {Number(p.gstRatePercent)}%
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Amazon reference (admin paste, optional)
                    </p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://www.amazon.in/dp/..."
                        value={refUrl[p.id] ?? p.amazonReferenceUrl ?? ""}
                        onChange={(e) =>
                          setRefUrl((r) => ({ ...r, [p.id]: e.target.value }))
                        }
                        className="text-xs"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => saveReference(p.id)}
                        disabled={busy}
                      >
                        Save
                      </Button>
                      {(refUrl[p.id] || p.amazonReferenceUrl) && (
                        <Button size="sm" variant="ghost" asChild>
                          <a
                            href={refUrl[p.id] || p.amazonReferenceUrl || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle className="text-base">Pending orders → GST invoice</CardTitle>
            <Button
              size="sm"
              disabled={busy || selectedLines.size === 0}
              onClick={issueInvoice}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-1" />
                  Issue ({selectedLines.size})
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent>
            {lines.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No pending lines. Record an order via API or agent tool{" "}
                <code className="text-xs">createOrderLine</code>.
              </p>
            ) : (
              <ul className="space-y-2">
                {lines.map((l) => (
                  <li key={l.id} className="flex items-center gap-2 text-sm border p-2 rounded">
                    <input
                      type="checkbox"
                      checked={selectedLines.has(l.id)}
                      onChange={() => toggleLine(l.id)}
                    />
                    <span className="flex-1">
                      {l.Product.name} × {l.quantity}
                      {l.Member ? ` — ${l.Member.name}` : ""}
                    </span>
                    <span>{formatCurrency(Number(l.unitPriceInr) * l.quantity)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent tax invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm space-y-1">
            {(invoicesData?.data?.invoices ?? invoicesData?.invoices ?? []).map(
              (inv: { id: string; invoiceNumber: string; grandTotalInr: string | number }) => (
                <li key={inv.id}>
                  <Link
                    href={`/dashboard/supplements/invoices/${inv.id}/print`}
                    className="text-primary hover:underline"
                  >
                    {inv.invoiceNumber}
                  </Link>
                  {" — "}
                  {formatCurrency(Number(inv.grandTotalInr))}
                </li>
              ),
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
