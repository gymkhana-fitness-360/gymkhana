"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error("Failed");
  return r.json();
});

type TimingData = {
  sampleSize: number;
  peakPaymentDayOfMonth: number | null;
  lowestPaymentDayOfMonth: number | null;
  suggestDiscountWindow: string | null;
  preferredMethod: string | null;
  personalizedPaymentOptions: string[];
};

export function PaymentTimingInsights() {
  const { data, isLoading, error } = useSWR<TimingData>(
    "/api/analytics/payment-timing",
    fetcher,
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Payment timing</CardTitle>
        <p className="text-xs text-muted-foreground">
          When members pay — use for discount windows and preferred methods
        </p>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        {isLoading && (
          <p className="text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        )}
        {error && <p className="text-destructive text-xs">Could not load payment timing.</p>}
        {data && (
          <>
            <p className="text-muted-foreground">
              Based on {data.sampleSize} completed payments (12 months)
            </p>
            {data.peakPaymentDayOfMonth != null && (
              <p>
                Peak day of month: <strong>{data.peakPaymentDayOfMonth}</strong>
              </p>
            )}
            {data.suggestDiscountWindow && (
              <p className="text-xs bg-muted/50 p-2 rounded-md">{data.suggestDiscountWindow}</p>
            )}
            {data.preferredMethod && (
              <p>
                Preferred method: <strong>{data.preferredMethod}</strong>
              </p>
            )}
            {data.personalizedPaymentOptions?.length > 0 && (
              <p className="text-xs">
                Suggest: {data.personalizedPaymentOptions.join(", ")}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
