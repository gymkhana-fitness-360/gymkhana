"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error("Failed");
  return r.json();
});

type ApprovalRow = {
  id: string;
  type: string;
  status: string;
  createdAt: string;
  payload: {
    memberId?: string;
    message?: string;
    phoneNumber?: string;
  };
};

export function ApprovalsQueuePanel() {
  const { data, isLoading, mutate } = useSWR<{ approvals: ApprovalRow[] }>(
    "/api/approvals",
    fetcher,
    { refreshInterval: 30_000 },
  );
  const [actingId, setActingId] = useState<string | null>(null);

  const decide = async (approvalId: string, decision: "APPROVED" | "REJECTED") => {
    setActingId(approvalId);
    try {
      await fetch("/api/approvals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalId, decision }),
      });
      await mutate();
    } finally {
      setActingId(null);
    }
  };

  const pending = data?.approvals ?? [];

  return (
    <Card className="border-amber-500/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          Approval queue
          {pending.length > 0 && (
            <Badge variant="secondary">{pending.length} pending</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        )}
        {!isLoading && pending.length === 0 && (
          <p className="text-xs text-muted-foreground">No pending agent or tool sends.</p>
        )}
        <ul className="space-y-2">
          {pending.map((a) => (
            <li key={a.id} className="p-3 rounded-lg border text-sm space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline">{a.type}</Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(a.createdAt).toLocaleString()}
                </span>
              </div>
              {a.payload.message && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {a.payload.message}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => decide(a.id, "APPROVED")}
                  disabled={actingId === a.id}
                >
                  {actingId === a.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Approve & send"
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => decide(a.id, "REJECTED")}
                  disabled={actingId === a.id}
                >
                  Reject
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
