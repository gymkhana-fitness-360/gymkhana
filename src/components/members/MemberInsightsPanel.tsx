"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import { Loader2, MessageSquare } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error("Failed");
  return r.json();
});

export function MemberInsightsPanel({ memberId }: { memberId: string }) {
  const { data, isLoading, error } = useSWR(
    memberId ? `/api/members/${memberId}/insights` : null,
    fetcher,
  );
  const [draft, setDraft] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);

  const loadDraft = async (purpose: "renewal" | "pt_upsell" | "general" = "general") => {
    setDrafting(true);
    try {
      const res = await fetch("/api/ai/whatsapp/draft-engagement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, purpose }),
      });
      if (!res.ok) throw new Error("draft failed");
      const json = await res.json();
      setDraft(json.draft);
    } catch {
      setDraft(null);
    } finally {
      setDrafting(false);
    }
  };

  if (!memberId) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Member insights</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {error && <p className="text-destructive text-xs">Insights unavailable.</p>}
        {data && (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{data.attendanceLast30Days} visits / 30d</Badge>
              {data.trainer && <Badge variant="outline">PT: {data.trainer}</Badge>}
              {data.opportunity && (
                <Badge variant="destructive">{data.opportunity.priority} priority</Badge>
              )}
            </div>
            {data.opportunity?.reasons?.[0] && (
              <p className="text-muted-foreground">{data.opportunity.reasons[0]}</p>
            )}
            {data.paymentTiming?.suggestDiscountWindow && (
              <p className="text-xs bg-muted/50 p-2 rounded-md">
                {data.paymentTiming.suggestDiscountWindow}
              </p>
            )}
            {data.paymentTiming?.personalizedPaymentOptions && (
              <p className="text-xs">
                Pay via: {data.paymentTiming.personalizedPaymentOptions.join(", ")}
              </p>
            )}
            {data.latestMembership && (
              <p>
                Plan {data.latestMembership.plan} · expires {data.latestMembership.endDate} ·{" "}
                {formatCurrency(data.latestMembership.amount)}
              </p>
            )}
            <ul className="text-xs text-muted-foreground space-y-1">
              {(data.engagementHints as string[]).map((h) => (
                <li key={h}>• {h}</li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadDraft("renewal")}
                disabled={drafting}
              >
                {drafting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Draft renewal
                  </>
                )}
              </Button>
              {data.trainer && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadDraft("pt_upsell")}
                  disabled={drafting}
                >
                  Draft PT
                </Button>
              )}
            </div>
            {draft && (
              <Textarea
                readOnly
                value={draft}
                className="text-xs min-h-[80px] mt-2"
                aria-label="Draft WhatsApp message"
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
