"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error("Failed");
  return r.json();
});

type CommEvent = {
  id: string;
  channel: string;
  direction: string;
  status: string;
  templateId: string | null;
  message: string;
  createdAt: string;
};

export function MemberEngagementTimeline({ memberId }: { memberId: string }) {
  const { data, isLoading, error } = useSWR<{ events: CommEvent[] }>(
    memberId ? `/api/members/${memberId}/communications` : null,
    fetcher,
  );

  if (!memberId) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Engagement timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {error && (
          <p className="text-xs text-destructive">Could not load communications.</p>
        )}
        <ul className="space-y-2 text-xs">
          {(data?.events ?? []).map((e) => (
            <li key={e.id} className="border rounded-md p-2">
              <div className="flex flex-wrap gap-2 mb-1">
                <Badge variant="outline">{e.channel}</Badge>
                <Badge variant="secondary">{e.status}</Badge>
                {e.templateId && <span className="text-muted-foreground">{e.templateId}</span>}
                <span className="text-muted-foreground ml-auto">
                  {new Date(e.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-muted-foreground line-clamp-2">{e.message}</p>
            </li>
          ))}
        </ul>
        {!isLoading && (data?.events?.length ?? 0) === 0 && (
          <p className="text-xs text-muted-foreground">No communication events yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
