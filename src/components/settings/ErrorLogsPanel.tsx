"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { formatDate } from "@/lib/utils";

type ErrorRow = {
  id: string;
  source: string;
  code: string;
  message: string;
  route: string | null;
  createdAt: string;
};

export function ErrorLogsPanel() {
  const [rows, setRows] = useState<ErrorRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/errors?limit=50", { credentials: "include" });
      const json = await res.json();
      if (res.ok && json.success) {
        setRows(json.data.errors ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Error logs</CardTitle>
          <CardDescription>Recent API, cron, and client errors for this gym.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </CardHeader>
      <CardContent>
        {loading && rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No errors recorded.</p>
        ) : (
          <div className="space-y-3 max-h-[480px] overflow-y-auto">
            {rows.map((row) => (
              <div key={row.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{row.source}</span>
                  <span>·</span>
                  <span>{row.code}</span>
                  <span>·</span>
                  <span>{formatDate(row.createdAt)}</span>
                  {row.route ? (
                    <>
                      <span>·</span>
                      <span className="truncate">{row.route}</span>
                    </>
                  ) : null}
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words">{row.message}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
