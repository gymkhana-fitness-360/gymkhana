"use client";

import useSWR from "swr";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function ActiveTrialsPanel() {
  const { data, isLoading } = useSWR("/api/trials/active?days=14", fetcher);

  const candidates = data?.candidates ?? [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Active trials & walk-ins</CardTitle>
        <p className="text-xs text-muted-foreground">
          {isLoading ? "…" : `${data?.openTrials ?? 0} open trials · ${data?.total ?? 0} visits (14d)`}
        </p>
      </CardHeader>
      <CardContent>
        {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        {!isLoading && candidates.length === 0 && (
          <p className="text-sm text-muted-foreground">No open free trials in the last 14 days.</p>
        )}
        <ul className="space-y-2 max-h-48 overflow-y-auto">
          {candidates.slice(0, 8).map((v: {
            id: string;
            name: string;
            phone: string;
            visitDate: string;
            hasMember: boolean;
            memberId: string | null;
          }) => (
            <li key={v.id} className="flex items-center justify-between gap-2 text-sm border rounded-md p-2">
              <div>
                <p className="font-medium">{v.name}</p>
                <p className="text-xs text-muted-foreground">{v.visitDate} · {v.phone}</p>
              </div>
              {v.memberId ? (
                <Link href={`/dashboard/members/${v.memberId}`} className="text-primary text-xs hover:underline">
                  View
                </Link>
              ) : (
                <Badge variant="secondary">Convert</Badge>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
