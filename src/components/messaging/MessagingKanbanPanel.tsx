"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function MessagingKanbanPanel() {
  const { data, isLoading } = useSWR("/api/messaging/kanban?include=renewals,expiry,admissions", fetcher);
  const boards = data?.data ?? {};

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading boards…</p>;

  const columns = [
    { key: "renewals", title: "Renewals (7d)" },
    { key: "expiry", title: "Expired / overdue" },
    { key: "admissions", title: "New admissions (14d)" },
  ] as const;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {columns.map(({ key, title }) => {
        const items = (boards[key] as Array<{ id: string; name: string; phone?: string | null }>) ?? [];
        return (
          <Card key={key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-64 overflow-y-auto">
              {items.map((m) => (
                <Link
                  key={m.id}
                  href={`/dashboard/members/${m.id}`}
                  className="block text-sm rounded-md border border-border p-2 hover:bg-muted/50"
                >
                  {m.name}
                  {m.phone && <span className="text-xs text-muted-foreground block">{m.phone}</span>}
                </Link>
              ))}
              {items.length === 0 && <p className="text-xs text-muted-foreground">Empty</p>}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
