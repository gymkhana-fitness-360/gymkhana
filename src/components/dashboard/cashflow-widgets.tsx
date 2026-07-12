"use client";

import useSWR from "swr";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, AlertCircle } from "lucide-react";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Failed to fetch cashflow");
    return r.json();
  });

interface CashflowSummary {
  period: { startDate: string; endDate: string };
  collected: number;
  expenses: number;
  salaries: number;
  net: number;
  outstanding: number;
}

export function CashflowWidgets({ compact = false }: { compact?: boolean }) {
  const { data, isLoading, error } = useSWR<CashflowSummary>(
    "/api/analytics/cashflow",
    fetcher,
    { revalidateOnFocus: false }
  );

  if (isLoading) {
    return (
      <div className={`grid gap-4 ${compact ? "md:grid-cols-2" : "md:grid-cols-3 lg:grid-cols-5"}`}>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6 h-20" />
          </Card>
        ))}
      </div>
    );
  }

  if (error || !data) return null;

  const items = compact
    ? [
        { label: "Net cashflow", value: data.net, icon: Wallet, color: data.net >= 0 ? "text-emerald-600" : "text-red-600" },
        { label: "Outstanding", value: data.outstanding, icon: AlertCircle, color: "text-orange-600" },
      ]
    : [
        { label: "Collected", value: data.collected, icon: TrendingUp, color: "text-emerald-600" },
        { label: "Expenses", value: data.expenses, icon: TrendingDown, color: "text-red-600" },
        { label: "Salaries", value: data.salaries, icon: TrendingDown, color: "text-rose-600" },
        { label: "Net", value: data.net, icon: Wallet, color: data.net >= 0 ? "text-emerald-600" : "text-red-600" },
        { label: "Outstanding", value: data.outstanding, icon: AlertCircle, color: "text-orange-600" },
      ];

  return (
    <div className={`grid gap-4 ${compact ? "md:grid-cols-2" : "md:grid-cols-3 lg:grid-cols-5"}`}>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
                  <p className={`text-2xl font-bold ${item.color}`}>{formatCurrency(item.value)}</p>
                </div>
                <Icon className={`h-8 w-8 opacity-60 ${item.color}`} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function CashflowSection() {
  const { data, isLoading, error } = useSWR<CashflowSummary>(
    "/api/analytics/cashflow",
    fetcher,
    { revalidateOnFocus: false }
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground text-sm">Loading cashflow…</CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-red-200">
        <CardContent className="pt-6 text-sm text-red-600">Failed to load cashflow data</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Cashflow</h3>
          <p className="text-xs text-muted-foreground">
            {data.period.startDate} — {data.period.endDate}
          </p>
        </div>
        <CashflowWidgets />
      </CardContent>
    </Card>
  );
}
