"use client";

import { formatCurrency, formatDate } from "@/lib/utils";
import type { MemberDetailData } from "./member-detail-types";
import { Badge } from "@/components/ui/badge";
import { Link2 } from "lucide-react";

const LIFECYCLE_COLORS: Record<string, string> = {
  ONGOING: "bg-green-500/10 text-green-700",
  RENEWED: "bg-blue-500/10 text-blue-700",
  EXPIRED: "bg-muted text-muted-foreground",
  CANCELLED: "bg-red-500/10 text-red-700",
};

export function MemberMembershipHistory({
  memberships,
}: {
  memberships: MemberDetailData["Membership"];
}) {
  if (!memberships || memberships.length <= 1) return null;

  return (
    <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
      <div className="px-6 py-5 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Membership History</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Plan</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Start</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">End</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Lifecycle</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Chain</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {memberships.slice(1).map((m) => (
              <tr key={m.id} className="hover:bg-muted/50">
                <td className="px-6 py-4 text-sm font-semibold">{m.Plan.name}</td>
                <td className="px-6 py-4 text-sm">{formatDate(m.startDate)}</td>
                <td className="px-6 py-4 text-sm">{formatDate(m.endDate)}</td>
                <td className="px-6 py-4 text-sm font-semibold text-green-600">{formatCurrency(m.amount)}</td>
                <td className="px-6 py-4">
                  {m.lifecycleStatus && (
                    <Badge className={LIFECYCLE_COLORS[m.lifecycleStatus] ?? ""}>
                      {m.lifecycleStatus}
                    </Badge>
                  )}
                </td>
                <td className="px-6 py-4 text-xs text-muted-foreground">
                  {m.previousMembershipId ? (
                    <span className="inline-flex items-center gap-1 font-mono">
                      <Link2 className="h-3 w-3" />
                      ← {m.previousMembershipId.slice(0, 8)}…
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
