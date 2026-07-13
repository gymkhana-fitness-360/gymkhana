"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import useSWR, { mutate as globalMutate } from "swr";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { createLogger } from "@/lib/logger";
import { triggerPaymentUpdate } from "@/lib/sidebar-events";

import { inferPaymentNotesMeta } from "@/domains/payments/rules";
import { swrFetcher } from "@/lib/swr/fetcher";
import { PaymentStatus, PaymentMethod } from "@prisma/client";
import { Search, Filter, RefreshCw, X, Loader2, MessageCircle, AlertCircle, Pencil, Trash2, CreditCard, DollarSign } from "lucide-react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { CheckboxInput } from "@/components/ui/checkbox-input";
import { useActionQueue } from "@/hooks/use-action-queue";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import {
  DashboardQuickEntryButton,
  DashboardQuickEntryPanel,
} from "@/components/dashboard/dashboard-quick-entry";

interface Payment {
  id: string;
  amount: string;
  method: PaymentMethod;
  status: PaymentStatus;
  reference: string | null;
  notes: string | null;
  packageDuration: string | null;
  isPersonalTrainer: boolean;
  friendsFamilyDiscount: boolean;
  monthlyRate: string | null;
  studentGymfloPlan: boolean;
  specialOccasion: string | null;
  receivedAt: string;
  Member: {
    id: string;
    name: string;
    phone: string;
    status: string;
  };
  User: {
    id: string;
    name: string;
  };
}

const DURATION_OPTIONS = [
  { value: "", label: "—" },
  { value: "New Admission", label: "New Admission" },
  { value: "1 Month", label: "monthly" },
  { value: "1 Month Renewal", label: "monthly renewal" },
  { value: "3 Months", label: "3mo" },
  { value: "6 Months", label: "6mo" },
  { value: "12 Months", label: "12mo" },
];

function formatDurationTag(d: string | null): string {
  if (!d) return "";
  const opt = DURATION_OPTIONS.find((o) => o.value === d);
  if (opt) return opt.label;
  const m = d.match(/^(\d+)\s*months?$/i);
  return m ? `${m[1]}mo` : d;
}

type PaymentDetails = { isPersonalTrainer?: boolean; seasonalPackage?: number | null } | null;

function PaymentTagsCell({
  payment,
  paymentDetails,
  onUpdate,
}: {
  payment: Payment;
  paymentDetails: PaymentDetails;
  onUpdate: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [duration, setDuration] = useState(payment.packageDuration ?? "");
  const [pt, setPt] = useState(payment.isPersonalTrainer);
  const editRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDuration(payment.packageDuration ?? "");
    setPt(payment.isPersonalTrainer);
  }, [payment.packageDuration, payment.isPersonalTrainer]);

  const effectiveDuration = payment.packageDuration || (paymentDetails?.seasonalPackage ? `${paymentDetails.seasonalPackage} Months` : null);
  const effectivePT = payment.isPersonalTrainer;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/payments/${payment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageDuration: duration || null,
          isPersonalTrainer: pt,
        }),
        credentials: "same-origin",
      });
      if (res.ok) {
        setEditing(false);
        onUpdate();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error || "Failed to update payment");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative flex items-center gap-1 flex-wrap">
      <div className="flex flex-wrap gap-1">
        {effectiveDuration && (
          <span className="inline-flex rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-700">
            {formatDurationTag(effectiveDuration)}
          </span>
        )}
        {effectivePT && (
          <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-semibold border bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-200 dark:border-indigo-700">
            PT
          </span>
        )}
      </div>
      <Button
        type="button"
        onClick={() => setEditing(!editing)}
        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
        aria-label="Edit tags"
      >
        <Pencil className="h-3 w-3" />
      </Button>
      {editing && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setEditing(false)} aria-hidden />
          <div ref={editRef} onClick={(e) => e.stopPropagation()} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 p-4 bg-card border border-border rounded-lg shadow-xl min-w-[200px] max-w-[90vw]">
            <div className="space-y-3 text-sm">
              <div>
                <label className="block font-semibold mb-1">Duration</label>
                <SelectNative
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-3 py-2 border rounded text-foreground bg-background"
                >
                  {DURATION_OPTIONS.map((o) => (
                    <option key={o.value || "empty"} value={o.value}>{o.label || "—"}</option>
                  ))}
                </SelectNative>
              </div>
              <div className="flex items-center gap-2">
                <label className="font-semibold">PT</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <CheckboxInput checked={pt} onChange={(e) => setPt(e.target.checked)} className="rounded" />
                  <span>with PT</span>
                </label>
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="button" onClick={handleSave} disabled={saving} className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded text-sm font-medium disabled:opacity-50">
                  {saving ? "..." : "Save"}
                </Button>
                <Button type="button" onClick={() => setEditing(false)} className="px-3 py-2 border rounded text-sm">Cancel</Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function PaymentsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "">("");
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [showWhatsAppImport, setShowWhatsAppImport] = useState(false);
  const [whatsAppMessages, setWhatsAppMessages] = useState("");
  const [whatsAppImportLoading, setWhatsAppImportLoading] = useState(false);
  const [whatsAppImportResult, setWhatsAppImportResult] = useState<any>(null);
  
  const [showQuickEntry, setShowQuickEntry] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const { enqueueAction, isQueued } = useActionQueue();

  const params = new URLSearchParams();
  if (appliedSearch) params.append("search", appliedSearch);
  if (statusFilter) params.append("status", statusFilter);
  if (methodFilter) params.append("method", methodFilter);
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  params.append("includeStats", "false");
  const paymentsUrl = `/api/payments?${params}`;

  const { data, isLoading, error, mutate: fetchPayments } = useSWR(paymentsUrl, swrFetcher, {
    revalidateOnMount: true,
  });

  useEffect(() => {
    if (data) {
      const paymentsArray = Array.isArray(data.payments) ? data.payments : Array.isArray(data) ? data : [];
      setPayments(paymentsArray);
    }
  }, [data]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => fetchPayments(), 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, fetchPayments]);

  const handleSearch = () => {
    setAppliedSearch(search);
  };

  useEffect(() => {
    setAppliedSearch(search);
  }, [statusFilter, methodFilter, startDate, endDate]);

  const clearFilters = () => {
    setSearch("");
    setAppliedSearch("");
    setStatusFilter("");
    setMethodFilter("");
    setStartDate("");
    setEndDate("");
  };

  if (error) {
    return (
      <div className="space-y-6">
        <DashboardPageHeader
          title="Payments"
          description="Track and manage all payment transactions"
        />
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-red-100 rounded-full p-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-red-900 mb-2">Failed to load payments</h3>
          <p className="text-sm text-red-700 mb-6">
            {error instanceof Error ? error.message : "An error occurred while fetching payments"}
          </p>
          <Button
            type="button"
            onClick={() => fetchPayments()}
            className="inline-flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 transition-colors font-semibold"
          >
            <RefreshCw className="h-5 w-5" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: PaymentStatus) => {
    const styles = {
      COMPLETED: "bg-green-100 text-green-800 border-green-200",
      PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
      FAILED: "bg-red-100 text-red-800 border-red-200",
      REFUNDED: "bg-muted text-foreground border-border",
    };
    return styles[status] || styles.COMPLETED;
  };

  const getMethodBadge = (method: PaymentMethod) => {
    const styles: Record<string, string> = {
      UPI: "bg-blue-100 text-blue-800 border-blue-200",
      CASH: "bg-green-100 text-green-800 border-green-200",
      MIXED: "bg-teal-100 text-teal-800 border-teal-200",
      CARD: "bg-purple-100 text-purple-800 border-purple-200",
      BANK_TRANSFER: "bg-indigo-100 text-indigo-800 border-indigo-200",
      OTHER: "bg-muted text-foreground border-border",
    };
    return styles[method] || styles.OTHER;
  };

  const parsePaymentNotes = inferPaymentNotesMeta;

  const hasActiveFilters = search || statusFilter || methodFilter || startDate || endDate;

  const handleWhatsAppImport = async () => {
    if (!whatsAppMessages.trim()) {
      toast.error("Please paste messages from your Admin Gym WhatsApp group");
      return;
    }
    setWhatsAppImportLoading(true);
    setWhatsAppImportResult(null);
    try {
      const res = await fetch("/api/payments/from-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: whatsAppMessages }),
        credentials: "same-origin",
      });
      if (res.status === 401) {
        router.replace("/login?callbackUrl=/dashboard/payments");
        return;
      }
      const result = await res.json();
      setWhatsAppImportResult(result);
      if (res.ok && result.created > 0) {
        await fetchPayments();
        setTimeout(() => {
          setShowWhatsAppImport(false);
          setWhatsAppMessages("");
          setWhatsAppImportResult(null);
        }, 3000);
      }
    } catch (err: unknown) {
      setWhatsAppImportResult({ error: "Import failed", details: String(err) });
    } finally {
      setWhatsAppImportLoading(false);
    }
  };

  const handleDeletePayment = async (paymentId: string, memberName: string) => {
    if (!confirm(`Delete payment for ${memberName}? You can undo within 30 minutes from the header.`)) {
      return;
    }

    enqueueAction(`delete-payment:${paymentId}`, async () => {
      setDeletingPaymentId(paymentId);
      try {
        const res = await fetch(`/api/payments/${paymentId}`, {
          method: "DELETE",
          credentials: "same-origin",
        });

        if (res.status === 401) {
          router.replace("/login?callbackUrl=/dashboard/payments");
          return;
        }

        if (res.status === 403) {
          toast.error("Admin access required to delete payments");
          return;
        }

        const result = await res.json();

        if (res.ok) {
          toast.success("Payment deleted — use Undo in header within 30 min to restore");
          await fetchPayments();
          globalMutate((key) => typeof key === "string" && key.startsWith("/api/members"));
          window.dispatchEvent(new Event("undo-stack-updated"));
          window.dispatchEvent(new Event("payment-updated"));
        } else {
          toast.error(result.error || "Failed to delete payment");
        }
      } catch (err: unknown) {
        toast.error("Failed to delete payment");
        logger.error(
          "Delete payment error",
          err instanceof Error ? err : new Error(String(err))
        );
      } finally {
        setDeletingPaymentId((current) => (current === paymentId ? null : current));
      }
    });
  };

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Payments"
        description="View and manage all payment transactions"
        actions={
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
            <CheckboxInput
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-input text-blue-600 focus:ring-2 focus:ring-ring cursor-pointer"
            />
            <span>Auto</span>
          </label>
          <DashboardQuickEntryButton open={showQuickEntry} onOpenChange={setShowQuickEntry} />
          {session?.user?.role === "ADMIN" && (
            <Button
              type="button"
              onClick={() => setShowWhatsAppImport(true)}
              className="inline-flex items-center gap-1.5 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-all text-sm font-medium"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </Button>
          )}
          <Button
            type="button"
            onClick={fetchPayments}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 text-sm font-medium"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
        }
      />

      <DashboardQuickEntryPanel
        open={showQuickEntry}
        onUnauthorized={() => router.replace("/login?callbackUrl=/dashboard/payments")}
        onSuccess={async () => {
          await fetchPayments();
          globalMutate((key) => typeof key === "string" && key.startsWith("/api/members"));
          globalMutate((key) => typeof key === "string" && key.startsWith("/api/renewals"));
          triggerPaymentUpdate(); // Update sidebar counts
        }}
      />

      {/* Filters */}
      <div className="bg-card rounded-lg shadow-md p-3 border border-border min-w-0 overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="bg-primary rounded-lg p-1.5">
              <Filter className="h-4 w-4 text-primary-foreground" />
            </div>
            <h3 className="text-sm font-bold text-card-foreground">Filters</h3>
            {hasActiveFilters && (
              <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold">
                Active
              </span>
            )}
          </div>
          {hasActiveFilters && (
            <Button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium text-muted-foreground hover:text-card-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Clear
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 min-w-0">
          <div className="sm:col-span-2 lg:col-span-2 min-w-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                className="w-full min-w-0 pl-9 pr-3 py-2 text-sm border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-ring transition-all bg-background text-foreground font-medium"
              />
            </div>
          </div>
          <SelectNative
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PaymentStatus | "")}
            className="min-w-0 px-3 py-2 text-sm border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-ring transition-all bg-background text-foreground font-medium cursor-pointer"
          >
            <option value="">All Status</option>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
          </SelectNative>
          <SelectNative
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value as PaymentMethod | "")}
            className="min-w-0 px-3 py-2 text-sm border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-ring transition-all bg-background text-foreground font-medium cursor-pointer"
          >
            <option value="">All Methods</option>
            <option value="UPI">UPI</option>
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="OTHER">Other</option>
          </SelectNative>
          <Button
            type="button"
            onClick={handleSearch}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-2 text-sm rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-semibold"
          >
            Search
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Start Date
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-ring transition-all bg-background text-foreground font-medium"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              End Date
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-ring transition-all bg-background text-foreground font-medium"
            />
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-card rounded-lg shadow-md border border-border overflow-hidden">
        <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 border-b border-border bg-muted/30">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm sm:text-base font-bold text-card-foreground">
              Payment Transactions
            </h3>
            {!isLoading && Array.isArray(payments) && payments.length > 0 && (
              <span className="text-xs sm:text-sm font-semibold text-card-foreground">
                {payments.length} {payments.length === 1 ? 'payment' : 'payments'}
              </span>
            )}
          </div>
        </div>
        
        {isLoading ? (
          <div className="p-16 text-center">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">Loading payments...</p>
          </div>
        ) : !Array.isArray(payments) || payments.length === 0 ? (
          <div className="p-16 text-center">
            <div className="bg-muted rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-foreground font-semibold text-lg mb-2">No payments found</p>
            <p className="text-muted-foreground text-sm">
              {hasActiveFilters 
                ? "Try adjusting your filters to see more results"
                : "No payment records available"}
            </p>
            {hasActiveFilters && (
              <Button
                type="button"
                onClick={clearFilters}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <>
          {/* Mobile card layout */}
          <div className="sm:hidden divide-y divide-border">
            {Array.isArray(payments) && payments.map((payment) => {
              const paymentAmount = parseFloat(payment.amount);
              const paymentDetails = parsePaymentNotes(payment.notes, paymentAmount);
              return (
                <div key={payment.id} className="p-4 bg-card hover:bg-muted/30 transition-colors">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="font-semibold text-foreground">{payment.Member.name}</div>
                      <div className="text-xs text-muted-foreground">{payment.Member.phone}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">{formatCurrency(payment.amount)}</div>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold border ${getStatusBadge(payment.status)}`}>
                        {payment.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold border ${getMethodBadge(payment.method)}`}>
                      {payment.method}
                    </span>
                    <PaymentTagsCell payment={payment} paymentDetails={paymentDetails} onUpdate={() => fetchPayments()} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1.5">{formatDate(payment.receivedAt)} · {payment.User.name}</div>
                </div>
              );
            })}
          </div>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-[10px] sm:text-xs font-bold text-foreground uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-[10px] sm:text-xs font-bold text-foreground uppercase tracking-wider">Member</th>
                  <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-[10px] sm:text-xs font-bold text-foreground uppercase tracking-wider">Amount</th>
                  <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-[10px] sm:text-xs font-bold text-foreground uppercase tracking-wider hidden md:table-cell">Method</th>
                  <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-[10px] sm:text-xs font-bold text-foreground uppercase tracking-wider hidden sm:table-cell">Tags</th>
                  <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-[10px] sm:text-xs font-bold text-foreground uppercase tracking-wider hidden xl:table-cell">Reference</th>
                  <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-[10px] sm:text-xs font-bold text-foreground uppercase tracking-wider hidden xl:table-cell">Received By</th>
                  <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-[10px] sm:text-xs font-bold text-foreground uppercase tracking-wider">Status</th>
                  {session?.user?.role === "ADMIN" && (
                    <th className="px-3 sm:px-4 lg:px-6 py-3 text-left text-[10px] sm:text-xs font-bold text-foreground uppercase tracking-wider">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {Array.isArray(payments) && payments.map((payment) => {
                  const paymentAmount = parseFloat(payment.amount);
                  const paymentDetails = parsePaymentNotes(payment.notes, paymentAmount);
                  return (
                    <tr key={payment.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-3 sm:px-4 lg:px-6 py-3 whitespace-nowrap">
                        <div className="text-xs sm:text-sm font-semibold text-foreground">
                          {formatDate(payment.receivedAt)}
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 whitespace-nowrap">
                        <div className="text-sm font-semibold text-foreground">
                          {payment.Member.name}
                        </div>
                        <div className="text-xs text-muted-foreground font-medium mt-0.5">
                          {payment.Member.phone}
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 whitespace-nowrap">
                        <div className="text-xs sm:text-sm font-bold text-green-600">
                          {formatCurrency(payment.amount)}
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 whitespace-nowrap hidden md:table-cell">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-bold leading-5 border ${getMethodBadge(payment.method)}`}>
                          {payment.method}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 hidden sm:table-cell">
                        <PaymentTagsCell payment={payment} paymentDetails={paymentDetails} onUpdate={() => fetchPayments()} />
                      </td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 whitespace-nowrap hidden xl:table-cell">
                        <div className="text-xs sm:text-sm text-muted-foreground font-medium">
                          {payment.reference || <span className="text-muted-foreground">—</span>}
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 whitespace-nowrap hidden xl:table-cell">
                        <div className="text-xs sm:text-sm text-muted-foreground font-medium">
                          {payment.User.name}
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 whitespace-nowrap">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-bold leading-5 border ${getStatusBadge(payment.status)}`}>
                          {payment.status}
                        </span>
                      </td>
                      {session?.user?.role === "ADMIN" && (
                        <td className="px-3 sm:px-4 lg:px-6 py-3 whitespace-nowrap">
                          <Button
                            type="button"
                            onClick={() => handleDeletePayment(payment.id, payment.Member.name)}
                            disabled={isQueued(`delete-payment:${payment.id}`)}
                            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete payment"
                          >
                            {deletingPaymentId === payment.id || isQueued(`delete-payment:${payment.id}`) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {/* WhatsApp Import Modal */}
      {showWhatsAppImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto text-foreground border border-border">
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-green-600" />
                Import from WhatsApp Group
              </h2>
              <Button
                type="button"
                onClick={() => {
                  setShowWhatsAppImport(false);
                  setWhatsAppMessages("");
                  setWhatsAppImportResult(null);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Paste payment messages from your Admin Gym WhatsApp group. Supported format:{" "}
                <code className="bg-muted px-1 rounded text-xs text-foreground">Member Name 800/- upi renewal</code>
              </p>
              <Textarea
                value={whatsAppMessages}
                onChange={(e) => setWhatsAppMessages(e.target.value)}
                placeholder="Guriya Chowdhury 800/- upi renewal&#10;John Doe 750 cash new&#10;..."
                rows={8}
                className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-foreground bg-background font-mono text-sm"
              />
              {whatsAppImportResult && (
                <div className={`p-4 rounded-xl text-sm ${whatsAppImportResult.error ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"}`}>
                  {whatsAppImportResult.error ? (
                    <p>{whatsAppImportResult.error}: {whatsAppImportResult.details}</p>
                  ) : (
                    <p>
                      Created {whatsAppImportResult.created} payment(s).
                      {whatsAppImportResult.skipped > 0 && ` Skipped ${whatsAppImportResult.skipped} (check errors).`}
                      {whatsAppImportResult.errors?.length > 0 && (
                        <ul className="mt-2 list-disc list-inside">
                          {whatsAppImportResult.errors.map((e: { line: number; error: string }) => (
                            <li key={e.line}>Line {e.line}: {e.error}</li>
                          ))}
                        </ul>
                      )}
                    </p>
                  )}
                </div>
              )}
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  onClick={() => {
                    setShowWhatsAppImport(false);
                    setWhatsAppMessages("");
                    setWhatsAppImportResult(null);
                  }}
                  className="px-4 py-2 border border-border rounded-xl text-foreground hover:bg-muted"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleWhatsAppImport}
                  disabled={whatsAppImportLoading || !whatsAppMessages.trim()}
                  className="inline-flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {whatsAppImportLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Import to Database
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
