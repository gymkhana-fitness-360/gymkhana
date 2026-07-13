"use client";

import { useState } from "react";
import { FileText, Search, Filter, Eye, Download, MessageSquare, Send, Loader2, Bell } from "lucide-react";
import Link from "next/link";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import {
  WHATSAPP_BUSINESS_LABEL,
  WHATSAPP_SETUP_HINT,
} from "@/lib/messaging/whatsapp-copy";
import { useActionQueue } from "@/hooks/use-action-queue";
import {
  type BillListItem,
  useBillsList,
  usePaymentsNotSent,
  useRenewalReminderCandidates,
} from "@/hooks/use-bills-list";

interface Bill extends BillListItem {}

function billMember(bill: Bill) {
  return bill.member ?? bill.Member;
}

function billGeneratedBy(bill: Bill) {
  return bill.generatedBy ?? bill.User;
}

interface PaymentNotSent {
  id: string;
  amount: string;
  method: string;
  receivedAt: string;
  packageDuration: string | null;
  Member: { id: string; name: string; phone: string; externalId: string | null };
  User: { name: string };
}

interface RenewalCandidate {
  id: string;
  name: string;
  phone: string;
  nextRenewalDate: string | null;
}

export default function BillsPage() {
  const [activeTab, setActiveTab] = useState("bills");
  const { bills, billsLoading: loading, mutateBills } = useBillsList();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterProgram, setFilterProgram] = useState<string>("ALL");

  const { paymentsNotSent, paymentsLoading, mutatePaymentsNotSent } = usePaymentsNotSent(
    activeTab === "not-sent",
  );

  const [reminderLookback, setReminderLookback] = useState("30");
  const [reminderFromDate, setReminderFromDate] = useState("");
  const { dueIn7Days, dueIn3Days, remindersLoading, mutateReminderCandidates } =
    useRenewalReminderCandidates(activeTab === "reminders", reminderLookback, reminderFromDate);

  const [sendingBillId, setSendingBillId] = useState<string | null>(null);
  const [sendingReminders, setSendingReminders] = useState(false);
  const { enqueueAction, isQueued } = useActionQueue();

  const sendBill = async (paymentId: string) => {
    enqueueAction(`send-bill:${paymentId}`, async () => {
      setSendingBillId(paymentId);
      try {
        const res = await fetch(`/api/payments/${paymentId}/send-bill`, { method: "POST" });
        const data = await res.json();
        if (res.ok && data.success) {
          await mutatePaymentsNotSent();
        } else {
          alert(data.error || data.message || "Failed to send bill");
        }
      } catch (e) {
        alert("Failed to send bill");
      } finally {
        setSendingBillId((current) => (current === paymentId ? null : current));
      }
    });
  };

  const sendBulkReminders = async (memberIds: string[]) => {
    if (memberIds.length === 0) return;
    if (!confirm(`Send renewal reminders to ${memberIds.length} member(s)?`)) return;
    enqueueAction("send-bulk-renewal-reminders", async () => {
      setSendingReminders(true);
      try {
        const res = await fetch("/api/renewals/send-bulk-reminders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberIds }),
        });
        const data = await res.json();
        if (res.ok) {
          alert(`Sent: ${data.sent}, Failed: ${data.failed}`);
          await mutateReminderCandidates();
        } else {
          alert(data.error || "Failed to send reminders");
        }
      } finally {
        setSendingReminders(false);
      }
    });
  };

  const filteredBills = bills.filter((bill) => {
    const m = billMember(bill);
    if (!m) return false;
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.phone.includes(searchTerm) ||
      bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.externalId && m.externalId.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesProgram = filterProgram === "ALL" || bill.programType === filterProgram;

    return matchesSearch && matchesProgram;
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ISSUED: "bg-blue-100 text-blue-800 border-blue-200",
      PARTIALLY_PAID: "bg-amber-100 text-amber-800 border-amber-200",
      PAID: "bg-green-100 text-green-800 border-green-200",
      OVERDUE: "bg-red-100 text-red-800 border-red-200",
      CANCELLED: "bg-muted text-muted-foreground border-border",
    };
    return styles[status] || styles.ISSUED;
  };

  const getProgramBadge = (program: string) => {
    const styles = {
      MAINTENANCE: "bg-blue-100 text-blue-800 border-blue-200",
      BODYBUILDING: "bg-purple-100 text-purple-800 border-purple-200",
      WEIGHT_LOSS: "bg-green-100 text-green-800 border-green-200",
    };
    return styles[program as keyof typeof styles] || styles.MAINTENANCE;
  };

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Bills & Receipts"
        description="Generate and manage member bills"
        actions={
          <>
            <Button asChild className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              <Link href="/dashboard/bills/whatsapp">
                <MessageSquare className="h-4 w-4" />
                {WHATSAPP_BUSINESS_LABEL} messages
              </Link>
            </Button>
            <Button asChild className="gap-2">
              <Link href="/dashboard/bills/generate">
                <FileText className="h-4 w-4" />
                Generate new bill
              </Link>
            </Button>
          </>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="bills">Bills</TabsTrigger>
          <TabsTrigger value="not-sent">Bills Not Sent</TabsTrigger>
          <TabsTrigger value="reminders">Renewal Reminders</TabsTrigger>
        </TabsList>

        <TabsContent value="bills" className="space-y-6">
      {/* Filters */}
      <div className="bg-card rounded-2xl shadow-lg p-4 border border-border">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name, phone, Member ID, or bill number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-input rounded-xl focus:ring-2 focus:ring-ring focus:border-ring transition-all duration-200 bg-background text-foreground font-medium"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <SelectNative
              value={filterProgram}
              onChange={(e) => setFilterProgram(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-input rounded-xl focus:ring-2 focus:ring-ring focus:border-ring transition-all duration-200 bg-background text-foreground font-medium appearance-none"
            >
              <option value="ALL">All Programs</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="BODYBUILDING">Bodybuilding</option>
              <option value="WEIGHT_LOSS">Weight Loss</option>
            </SelectNative>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl shadow-md p-5 border border-border">
          <p className="text-xs font-semibold text-muted-foreground mb-1">Total Bills</p>
          <p className="text-2xl font-bold text-card-foreground">{bills.length}</p>
        </div>
        <div className="bg-card rounded-xl shadow-md p-5 border border-border">
          <p className="text-xs font-semibold text-muted-foreground mb-1">Maintenance</p>
          <p className="text-2xl font-bold text-blue-600">
            {bills.filter((b) => b.programType === "MAINTENANCE").length}
          </p>
        </div>
        <div className="bg-card rounded-xl shadow-md p-5 border border-border">
          <p className="text-xs font-semibold text-muted-foreground mb-1">Bodybuilding</p>
          <p className="text-2xl font-bold text-purple-600">
            {bills.filter((b) => b.programType === "BODYBUILDING").length}
          </p>
        </div>
        <div className="bg-card rounded-xl shadow-md p-5 border border-border">
          <p className="text-xs font-semibold text-muted-foreground mb-1">Weight Loss</p>
          <p className="text-2xl font-bold text-green-600">
            {bills.filter((b) => b.programType === "WEIGHT_LOSS").length}
          </p>
        </div>
      </div>

      {/* Bills Table */}
      <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground font-medium">Loading bills...</div>
        ) : filteredBills.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground font-medium">
            {searchTerm || filterProgram !== "ALL" ? "No bills match your filters" : "No bills generated yet"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                    Bill Number
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                    Program
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                    Month
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                    Paid
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                    Due
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                    Validity
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                    Generated
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {filteredBills.map((bill) => {
                  const m = billMember(bill);
                  const gen = billGeneratedBy(bill);
                  return (
                  <tr key={bill.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono font-semibold text-foreground">
                        {bill.billNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-foreground">{m?.name}</div>
                      <div className="text-xs text-muted-foreground font-medium">{m?.phone}</div>
                      {m?.externalId && (
                        <div className="text-xs text-muted-foreground font-mono">{m.externalId}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold border ${getProgramBadge(
                          bill.programType
                        )}`}
                      >
                        {bill.programType.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-foreground">{bill.month}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {bill.hideAmount ? (
                        <span className="text-sm text-muted-foreground italic">Hidden</span>
                      ) : (
                        <div className="text-sm font-bold text-green-600">
                          {formatCurrency(Number(bill.amount))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold border ${getStatusBadge(bill.status)}`}>
                        {bill.status?.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-emerald-600">
                      {formatCurrency(Number(bill.paidAmount ?? 0))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-orange-600">
                      {formatCurrency(Number(bill.dueAmount ?? 0))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs text-muted-foreground">
                        {formatDate(bill.validFrom)} - {formatDate(bill.validTo)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs text-muted-foreground">{formatDate(bill.createdAt)}</div>
                      <div className="text-xs text-muted-foreground">{gen?.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/bills/${bill.id}`}
                          className="text-blue-600 hover:text-blue-700 font-semibold transition-colors p-2 hover:bg-blue-50 rounded-lg"
                          title="View Bill"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Button
                          type="button"
                          onClick={() => window.open(`/api/bills/${bill.id}/pdf`, "_blank")}
                          className="text-purple-600 hover:text-purple-700 font-semibold transition-colors p-2 hover:bg-purple-50 rounded-lg"
                          title="Download PDF"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          onClick={() => window.open(`/dashboard/bills/${bill.id}/print`, "_blank")}
                          className="text-green-600 hover:text-green-700 font-semibold transition-colors p-2 hover:bg-green-50 rounded-lg"
                          title="Print Bill"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </TabsContent>

        <TabsContent value="not-sent" className="space-y-4">
          <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-muted/30">
              <h3 className="font-semibold">Payments without bill sent</h3>
              <p className="text-xs text-muted-foreground mt-0.5">All payments after Disha Karmakar (or cutoff). Enable {WHATSAPP_BUSINESS_LABEL} API in Settings → Notifications to send receipts.</p>
            </div>
            {paymentsLoading ? (
              <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /></div>
            ) : paymentsNotSent.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">No payments pending bill send</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase">Member</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paymentsNotSent.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3 text-sm">{formatDate(p.receivedAt)}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold">{p.Member.name}</div>
                          <div className="text-xs text-muted-foreground">{p.Member.phone}</div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-green-600">{formatCurrency(Number(p.amount))}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800">
                            {p.packageDuration || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            type="button"
                            onClick={() => sendBill(p.id)}
                            disabled={isQueued(`send-bill:${p.id}`)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                          >
                            {sendingBillId === p.id || isQueued(`send-bill:${p.id}`) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            Send bill
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="reminders" className="space-y-4">
          <div className="bg-card rounded-2xl shadow-lg p-4 border border-border">
            <h3 className="font-semibold mb-3">Renewal reminder candidates</h3>
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Lookback (days)</label>
                <SelectNative
                  value={reminderLookback}
                  onChange={(e) => { setReminderLookback(e.target.value); setReminderFromDate(""); }}
                  className="px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="30">30 days</option>
                  <option value="45">45 days</option>
                  <option value="60">60 days</option>
                  <option value="90">90 days</option>
                </SelectNative>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Or from date (custom)</label>
                <Input
                  type="date"
                  value={reminderFromDate}
                  onChange={(e) => { setReminderFromDate(e.target.value); setReminderLookback("30"); }}
                  className="px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <Button
                type="button"
                onClick={() => mutateReminderCandidates()}
                disabled={remindersLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {remindersLoading ? "Loading..." : "Refresh"}
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
              <div className="px-4 py-3 bg-amber-100 dark:bg-amber-900/30 border-b flex items-center justify-between">
                <h4 className="font-semibold">Due in 7 days ({dueIn7Days.length})</h4>
                <Button
                  type="button"
                  onClick={() => sendBulkReminders(dueIn7Days.map((m) => m.id))}
                  disabled={dueIn7Days.length === 0 || sendingReminders || isQueued("send-bulk-renewal-reminders")}
                  className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 disabled:opacity-50"
                >
                  Send all
                </Button>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {dueIn7Days.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">None</div>
                ) : (
                  <ul className="divide-y divide-border">
                    {dueIn7Days.map((m) => (
                      <li key={m.id} className="px-4 py-2 flex justify-between items-center">
                        <div>
                          <span className="font-medium">{m.name}</span>
                          <span className="text-xs text-muted-foreground block">{m.phone}</span>
                        </div>
                        <span className="text-xs">{m.nextRenewalDate ? formatDate(m.nextRenewalDate) : "—"}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
              <div className="px-4 py-3 bg-red-100 dark:bg-red-900/30 border-b flex items-center justify-between">
                <h4 className="font-semibold">Due in 3 days ({dueIn3Days.length})</h4>
                <Button
                  type="button"
                  onClick={() => sendBulkReminders(dueIn3Days.map((m) => m.id))}
                  disabled={dueIn3Days.length === 0 || sendingReminders || isQueued("send-bulk-renewal-reminders")}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  Send all
                </Button>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {dueIn3Days.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">None</div>
                ) : (
                  <ul className="divide-y divide-border">
                    {dueIn3Days.map((m) => (
                      <li key={m.id} className="px-4 py-2 flex justify-between items-center">
                        <div>
                          <span className="font-medium">{m.name}</span>
                          <span className="text-xs text-muted-foreground block">{m.phone}</span>
                        </div>
                        <span className="text-xs">{m.nextRenewalDate ? formatDate(m.nextRenewalDate) : "—"}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {WHATSAPP_SETUP_HINT}
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
