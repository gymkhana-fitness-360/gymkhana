"use client";

import useSWR from "swr";
import Link from "next/link";
import { Bot, Target, Sparkles } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { RenewalsChasePanel } from "@/components/renewals/RenewalsChasePanel";
import { ApprovalsQueuePanel } from "@/components/approvals/ApprovalsQueuePanel";
import { LeadsFollowUpPanel } from "@/components/leads/LeadsFollowUpPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AgentProfileId } from "@/domains/agents/profiles";
import { marketingPath } from "@/lib/site-config";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AgentWorkspacePage() {
  const { data: profilesData } = useSWR("/api/agents/profiles", fetcher);
  const { data: factsData } = useSWR("/api/intelligence/gym-facts", fetcher);

  const profiles = profilesData?.data?.profiles ?? profilesData?.profiles ?? [];
  const facts = factsData?.data?.facts ?? factsData?.facts ?? [];

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Agent workspace"
        description="Goals, chase, approvals, and gym facts — one surface for operator + agent workflows."
      />

      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Workforce agents (tool profiles)
          </CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-3">
          {profiles.map((p: {
            id: AgentProfileId;
            name: string;
            description: string;
            goalHint: string;
            tools: string[];
          }) => (
            <div key={p.id} className="border rounded-lg p-3 space-y-2">
              <p className="font-semibold">{p.name}</p>
              <p className="text-xs text-muted-foreground">{p.description}</p>
              <p className="text-xs text-muted-foreground">{p.goalHint}</p>
              <div className="flex flex-wrap gap-1">
                {p.tools.slice(0, 4).map((t) => (
                  <Badge key={t} variant="secondary" className="text-[10px]">
                    {t}
                  </Badge>
                ))}
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href={marketingPath("/developers")}>Developer docs</a>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Gym facts (nightly)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2 max-h-48 overflow-y-auto">
            {facts.length === 0 ? (
              <p className="text-muted-foreground">
                Facts populate after cron <code>refresh-daily-gym-facts</code>.
              </p>
            ) : (
              facts.map((f: { factKey: string; factType: string; value: unknown }) => (
                <div key={f.factKey} className="border-b pb-1">
                  <span className="font-mono">{f.factKey}</span>
                  <Badge variant="outline" className="ml-2 text-[10px]">
                    {f.factType}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              Quick links
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <Link href="/dashboard/renewals" className="text-primary hover:underline">
              Renewals chase
            </Link>
            <Link href="/dashboard/leads" className="text-primary hover:underline">
              Leads pipeline
            </Link>
            <Link href="/dashboard/supplements" className="text-primary hover:underline">
              Supplements (GST)
            </Link>
            <p className="text-xs text-muted-foreground pt-2">
              Autonomous recovery queues <strong>approvals only</strong> at 03:00 —
              no auto-send.
            </p>
          </CardContent>
        </Card>
      </div>

      <ApprovalsQueuePanel />
      <RenewalsChasePanel />
      <LeadsFollowUpPanel compact />
    </div>
  );
}
