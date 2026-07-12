"use client";

import { useState, type ReactNode } from "react";

type Tab = "overview" | "payments" | "memberships" | "insights" | "comms";

export function MemberDetailTabs({
  overview,
  payments,
  memberships,
  insights,
  comms,
}: {
  overview: ReactNode;
  payments: ReactNode;
  memberships: ReactNode;
  insights: ReactNode;
  comms: ReactNode;
}) {
  const [tab, setTab] = useState<Tab>("overview");

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "payments", label: "Payments" },
    { id: "memberships", label: "Memberships" },
    { id: "insights", label: "Insights" },
    { id: "comms", label: "Comms" },
  ];

  const content =
    tab === "overview"
      ? overview
      : tab === "payments"
        ? payments
        : tab === "memberships"
          ? memberships
          : tab === "insights"
            ? insights
            : comms;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              tab === t.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {content}
    </div>
  );
}
