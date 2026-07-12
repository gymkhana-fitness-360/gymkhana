"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Sparkles } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error("Failed");
  return r.json();
});

type OfferRow = {
  id: string;
  name: string;
  description: string | null;
  discountPercent: string | number | null;
  status: string;
};

export function OffersPanel() {
  const { data, isLoading, mutate } = useSWR<{ offers: OfferRow[] }>(
    "/api/offers",
    fetcher,
  );
  const [name, setName] = useState("");
  const [discountPercent, setDiscountPercent] = useState("10");
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  const createOffer = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          discountPercent: Number(discountPercent) || undefined,
          status: "DRAFT",
        }),
      });
      setName("");
      await mutate();
    } finally {
      setSaving(false);
    }
  };

  const suggestFromHeatmap = async () => {
    setSuggesting(true);
    try {
      await fetch("/api/offers/suggest-quiet", { method: "POST" });
      await mutate();
    } finally {
      setSuggesting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-lg">Offers & promos</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={suggestFromHeatmap}
          disabled={suggesting}
        >
          {suggesting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-1" />
              From quiet hours
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Offer name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1"
          />
          <Input
            type="number"
            placeholder="% off"
            value={discountPercent}
            onChange={(e) => setDiscountPercent(e.target.value)}
            className="w-24"
          />
          <Button onClick={createOffer} disabled={saving || !name.trim()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
        {isLoading && (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        )}
        <ul className="space-y-2">
          {(data?.offers ?? []).map((o) => (
            <li
              key={o.id}
              className="flex items-center justify-between gap-2 p-2 rounded-md border text-sm"
            >
              <span className="font-medium truncate">{o.name}</span>
              <div className="flex items-center gap-2 shrink-0">
                {o.discountPercent != null && (
                  <span className="text-xs text-muted-foreground">
                    {Number(o.discountPercent)}% off
                  </span>
                )}
                <Badge variant={o.status === "ACTIVE" ? "default" : "secondary"}>
                  {o.status}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
        {!isLoading && (data?.offers?.length ?? 0) === 0 && (
          <p className="text-xs text-muted-foreground">No offers yet. Create one or suggest from attendance heatmap.</p>
        )}
      </CardContent>
    </Card>
  );
}
