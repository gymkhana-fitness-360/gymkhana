"use client";

import useSWR from "swr";
import Link from "next/link";
import { Phone, Loader2, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Failed to load leads");
    return r.json();
  });

type LeadRow = {
  id: string;
  name: string;
  phone: string;
  status: string;
  followUpAt: string | null;
  source: string;
};

export function LeadsFollowUpPanel({ compact = false }: { compact?: boolean }) {
  const { data, isLoading, mutate } = useSWR<{ data?: { leads?: LeadRow[] }; leads?: LeadRow[] }>(
    "/api/leads/follow-up",
    fetcher,
    { refreshInterval: 60_000 },
  );

  // API wraps payloads in { success, data: { leads } }; fall back to raw.
  const leads = data?.data?.leads ?? data?.leads ?? [];

  const draftWhatsApp = (lead: LeadRow) => {
    const first = lead.name.split(" ")[0];
    const msg = `Hi ${first}, following up on your gym enquiry. Would you like to book a free trial? Reply here or call us.`;
    window.open(
      `https://wa.me/91${lead.phone.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(msg)}`,
      "_blank",
    );
  };

  return (
    <Card className={compact ? "" : "border-orange-500/30"}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Phone className="h-4 w-4" />
          Leads due for follow-up
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => mutate()}>
            Refresh
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/leads">All leads</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </p>
        )}
        {!isLoading && leads.length === 0 && (
          <p className="text-sm text-muted-foreground">No follow-ups due today.</p>
        )}
        {!isLoading && leads.length > 0 && (
          <ul className="space-y-2">
            {leads.slice(0, compact ? 5 : 10).map((lead) => (
              <li
                key={lead.id}
                className="flex items-center gap-2 p-2 rounded-md border text-sm"
              >
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{lead.name}</span>
                  <span className="text-muted-foreground ml-2">{lead.phone}</span>
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {lead.status}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => draftWhatsApp(lead)}
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Draft
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
