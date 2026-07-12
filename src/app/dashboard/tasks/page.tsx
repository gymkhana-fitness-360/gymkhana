"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { Loader2, RefreshCw, CheckCircle, XCircle } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function TasksPage() {
  const { data, mutate, isLoading } = useSWR("/api/admin/tasks", fetcher);
  const [syncing, setSyncing] = useState(false);

  const tasks = data?.data ?? [];

  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
      });
      await mutate();
    } finally {
      setSyncing(false);
    }
  }, [mutate]);

  const resolve = async (taskId: string, action: "resolve" | "dismiss") => {
    await fetch("/api/admin/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, taskId }),
    });
    await mutate();
  };

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Tasks"
        description="Admin inbox — late payments, data issues, and items needing resolution."
        actions={
          <Button variant="outline" size="sm" onClick={sync} disabled={syncing}>
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">Sync</span>
          </Button>
        }
      />
      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : (
        <div className="space-y-3">
          {tasks.map((t: { id: string; title: string; description: string; priority: string; status: string }) => (
            <Card key={t.id}>
              <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{t.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{t.description}</p>
                </div>
                <Badge variant="outline">{t.priority}</Badge>
              </CardHeader>
              {t.status === "PENDING" && (
                <CardContent className="flex gap-2 pt-0">
                  <Button size="sm" onClick={() => resolve(t.id, "resolve")}>
                    <CheckCircle className="h-4 w-4 mr-1" /> Resolve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => resolve(t.id, "dismiss")}>
                    <XCircle className="h-4 w-4 mr-1" /> Dismiss
                  </Button>
                </CardContent>
              )}
            </Card>
          ))}
          {tasks.length === 0 && <p className="text-muted-foreground text-sm">No tasks — run Sync to scan.</p>}
        </div>
      )}
    </div>
  );
}
