"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { Loader2, BarChart3, Send } from "lucide-react";

type Segment = "expiring_this_week" | "overdue" | "lapsed_30d" | "all_active";

type Probe = {
  audienceCount: number;
  sample: Array<{ id: string; name: string; phone: string | null }>;
  analytics: {
    withPhone: number;
    activeMembers: number;
    expiringIn7Days: number;
    overdueCount: number;
  };
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function CampaignsPage() {
  const { data: listData, mutate } = useSWR("/api/campaigns", fetcher);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [segment, setSegment] = useState<Segment>("expiring_this_week");
  const [probe, setProbe] = useState<Probe | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const runProbe = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/campaigns/probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segment }),
      });
      const json = await res.json();
      if (json.success) setProbe(json.data);
    } finally {
      setLoading(false);
    }
  };

  const createCampaign = async () => {
    if (!name.trim() || !message.trim()) return;
    setCreating(true);
    try {
      await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, message, segment }),
      });
      setName("");
      setMessage("");
      setProbe(null);
      await mutate();
    } finally {
      setCreating(false);
    }
  };

  const queueSend = async (id: string) => {
    await fetch(`/api/campaigns/${id}/send`, { method: "POST" });
    await mutate();
  };

  const campaigns = listData?.data ?? [];

  return (
    <div className="space-y-6 max-w-3xl">
      <DashboardPageHeader
        title="Campaigns"
        description="One-page create: probe audience analytics, draft, then queue WhatsApp send."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Create campaign</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="March renewals" />
          </div>
          <div className="space-y-2">
            <Label>Audience segment</Label>
            <SelectNative
              value={segment}
              onChange={(e) => setSegment(e.target.value as Segment)}
              className="mt-1"
            >
              <option value="expiring_this_week">Expiring this week</option>
              <option value="overdue">Overdue (30d)</option>
              <option value="lapsed_30d">Lapsed 30+ days</option>
              <option value="all_active">All active members</option>
            </SelectNative>
          </div>
          <Button type="button" variant="secondary" onClick={runProbe} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
            <span className="ml-2">Probe analytics</span>
          </Button>
          {probe && (
            <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm space-y-2">
              <p><strong>{probe.audienceCount}</strong> members in segment · <strong>{probe.analytics.withPhone}</strong> with phone</p>
              <p className="text-muted-foreground">
                Gym: {probe.analytics.activeMembers} active · {probe.analytics.expiringIn7Days} expiring 7d · {probe.analytics.overdueCount} overdue
              </p>
              {probe.sample.length > 0 && (
                <ul className="text-xs text-muted-foreground">
                  {probe.sample.map((m) => (
                    <li key={m.id}>{m.name} — {m.phone ?? "no phone"}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Hi {{name}}, your membership…" />
          </div>
          <Button onClick={createCampaign} disabled={creating || !probe}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="ml-2">Create draft</span>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent campaigns</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {campaigns.map((c: { id: string; name: string; status: string; recipientCount: number }) => (
            <div key={c.id} className="flex items-center justify-between gap-2 border border-border rounded-lg p-3">
              <div>
                <p className="font-medium text-sm">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.recipientCount} recipients · {c.status}</p>
              </div>
              {c.status === "DRAFT" && (
                <Button size="sm" variant="outline" onClick={() => queueSend(c.id)}>Queue send</Button>
              )}
            </div>
          ))}
          {campaigns.length === 0 && <p className="text-sm text-muted-foreground">No campaigns yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
