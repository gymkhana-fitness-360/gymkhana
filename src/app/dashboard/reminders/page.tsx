"use client";

import { useState } from "react";
import { formatDate, formatCurrency, getDaysUntil } from "@/lib/utils";
import Link from "next/link";
import { Bell, RefreshCw, AlertCircle, CheckCircle, X, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SelectNative } from "@/components/ui/select-native";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import useSWR from "swr";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to fetch data");
  }
  return res.json();
};

interface ReminderLog {
  id: string;
  memberId: string;
  type: "RENEWAL" | "OVERDUE" | "CUSTOM";
  phoneNumber: string;
  message: string;
  sentAt: string;
  status: "SENT" | "FAILED" | "DELIVERED" | "READ";
  error: string | null;
  Member: {
    id: string;
    name: string;
    phone: string;
    status: string;
    Membership: Array<{
      endDate: string;
    }>;
  };
  SentBy: {
    name: string;
  };
}

interface UnpaidMember {
  membership: {
    id: string;
    memberId: string;
    endDate: string;
    amount: number;
  };
  member: {
    id: string;
    name: string;
    phone: string;
    externalId: string | null;
  };
  plan: {
    name: string;
  };
  lastReminded: string;
}

export default function RemindersPage() {
  const [daysFilter, setDaysFilter] = useState<"7" | "30" | "all">("7");
  const [statusFilter, setStatusFilter] = useState<"all" | "SENT" | "FAILED">("all");

  const { data: historyData, isLoading: historyLoading, mutate: mutateHistory } = useSWR<{ logs: ReminderLog[] }>(
    `/api/reminders/history?days=${daysFilter}${statusFilter !== "all" ? `&status=${statusFilter}` : ""}`,
    fetcher
  );

  const { data: unpaidData, isLoading: unpaidLoading, mutate: mutateUnpaid } = useSWR<{ unpaid: UnpaidMember[] }>(
    "/api/reminders/unpaid",
    fetcher
  );

  const handleRefresh = async () => {
    await Promise.all([mutateHistory(), mutateUnpaid()]);
  };

  const isLoading = historyLoading || unpaidLoading;

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Reminders"
        description="Track sent reminders and unpaid members"
        actions={
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {/* Unpaid Members (Reminded but not paid) */}
      <Card className="border-orange-200 bg-orange-50/30 dark:bg-orange-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            Unpaid After Reminders
          </CardTitle>
          <CardDescription>
            Members who were reminded but haven&apos;t paid yet (currently overdue)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {unpaidLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
              <p className="mt-3 text-sm text-muted-foreground">Loading unpaid members...</p>
            </div>
          ) : !unpaidData?.unpaid || unpaidData.unpaid.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">All reminded members have paid!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {unpaidData.unpaid.map((item) => (
                <div
                  key={item.membership.id}
                  className="p-3 rounded-lg border border-orange-200 bg-card dark:bg-gray-900 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-foreground truncate">
                        {item.member.name}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.member.phone}</p>
                      {item.member.externalId && (
                        <p className="text-xs text-muted-foreground font-mono">{item.member.externalId}</p>
                      )}
                    </div>
                    <Link
                      href={`/dashboard/members/${item.member.id}`}
                      className="ml-3 text-xs text-blue-600 hover:text-blue-700 font-semibold whitespace-nowrap"
                    >
                      View →
                    </Link>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Plan:</span>
                      <span className="ml-1 inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
                        {item.plan.name}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="ml-1 font-bold text-green-600">
                        {formatCurrency(item.membership.amount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Expired:</span>
                      <span className="ml-1 text-red-600 font-medium">
                        {formatDate(item.membership.endDate)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Last Reminded:</span>
                      <span className="ml-1 text-foreground font-medium">
                        {formatDate(item.lastReminded)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reminder History */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Reminder History
              </CardTitle>
              <CardDescription>All sent reminders with status</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* Days Filter */}
              <SelectNative
                value={daysFilter}
                onChange={(e) => setDaysFilter(e.target.value as "7" | "30" | "all")}
                className="text-xs px-2 py-1 border border-input rounded-md bg-background"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="all">All time</option>
              </SelectNative>
              {/* Status Filter */}
              <SelectNative
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | "SENT" | "FAILED")}
                className="text-xs px-2 py-1 border border-input rounded-md bg-background"
              >
                <option value="all">All statuses</option>
                <option value="SENT">Sent</option>
                <option value="FAILED">Failed</option>
              </SelectNative>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-3 text-sm text-muted-foreground">Loading history...</p>
            </div>
          ) : !historyData?.logs || historyData.logs.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No reminders sent yet</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {historyData.logs.map((log) => (
                <div
                  key={log.id}
                  className={`p-3 rounded-lg border transition-all ${
                    log.status === "SENT" || log.status === "DELIVERED" || log.status === "READ"
                      ? "border-green-200 bg-green-50/30 dark:bg-green-950/10"
                      : "border-red-200 bg-red-50/30 dark:bg-red-950/10"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-foreground">
                          {log.Member.name}
                        </h4>
                        <Badge
                          variant={log.status === "SENT" || log.status === "DELIVERED" || log.status === "READ" ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {log.status}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {log.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{log.phoneNumber}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Sent by {log.SentBy.name} on {formatDate(log.sentAt)}
                      </p>
                      {log.error && (
                        <div className="mt-2 p-2 rounded bg-red-100 dark:bg-red-950/20 border border-red-200">
                          <p className="text-xs text-red-800 dark:text-red-200">
                            <strong>Error:</strong> {log.error}
                          </p>
                        </div>
                      )}
                    </div>
                    <Link
                      href={`/dashboard/members/${log.memberId}`}
                      className="ml-3 text-xs text-blue-600 hover:text-blue-700 font-semibold whitespace-nowrap"
                    >
                      View →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
