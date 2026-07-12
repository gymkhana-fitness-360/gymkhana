"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2, Zap, CheckCircle, X, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { QuickEntryResultState } from "@/lib/quick-entry-types";

export function DashboardQuickEntryButton({
  open,
  onOpenChange,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      onClick={() => onOpenChange(!open)}
      className={cn(
        "inline-flex items-center gap-1.5 bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition-all text-sm font-medium",
        className
      )}
    >
      <Zap className="h-3.5 w-3.5 shrink-0" />
      Quick Entry
    </Button>
  );
}

type DashboardQuickEntryPanelProps = {
  open: boolean;
  onSuccess?: () => void | Promise<void>;
  onUnauthorized?: () => void;
};

type SubmitQuickEntryOptions = {
  text: string;
  /** Main submit clears previous result unless confirming a duplicate */
  clearResultFirst?: boolean;
  useMemberId?: string;
  confirmDuplicate?: boolean;
  verifyPhone?: string;
  pendingMemberId?: string | null;
};

export function DashboardQuickEntryPanel({
  open,
  onSuccess,
  onUnauthorized,
}: DashboardQuickEntryPanelProps) {
  const [quickEntryText, setQuickEntryText] = useState("");
  const [quickEntryLoading, setQuickEntryLoading] = useState(false);
  const [quickEntryResult, setQuickEntryResult] = useState<QuickEntryResultState | null>(null);
  const [quickEntryVerifyPhone, setQuickEntryVerifyPhone] = useState("");
  const [quickEntryPendingMemberId, setQuickEntryPendingMemberId] = useState<string | null>(null);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [lastBulkResponse, setLastBulkResponse] = useState<QuickEntryResultState | null>(null);
  const clearAfterSuccessTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const postQuickEntry = useCallback(async (body: Record<string, unknown>) => {
    const res = await fetch("/api/payments/quick-entry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "same-origin",
    });
    const result = (await res.json().catch(() => ({}))) as QuickEntryResultState;
    return { res, result };
  }, []);

  const scheduleClearIfDone = useCallback((next: QuickEntryResultState) => {
    const bulkHasFailures = next.bulk === true && (next.failed ?? 0) > 0;
    if (clearAfterSuccessTimeoutRef.current) {
      clearTimeout(clearAfterSuccessTimeoutRef.current);
      clearAfterSuccessTimeoutRef.current = null;
    }
    if (!bulkHasFailures && next.success) {
      clearAfterSuccessTimeoutRef.current = setTimeout(() => {
        clearAfterSuccessTimeoutRef.current = null;
        setQuickEntryText("");
        setQuickEntryResult(null);
        setLastBulkResponse(null);
      }, 15_000);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (clearAfterSuccessTimeoutRef.current) {
        clearTimeout(clearAfterSuccessTimeoutRef.current);
      }
    };
  }, []);

  const submitQuickEntryPayload = useCallback(
    async (opts: SubmitQuickEntryOptions) => {
      const {
        text,
        clearResultFirst = false,
        useMemberId,
        confirmDuplicate,
        verifyPhone,
        pendingMemberId,
      } = opts;
      if (!text.trim()) return;

      setQuickEntryLoading(true);
      if (clearResultFirst) {
        setQuickEntryResult(null);
      }
      try {
        const { res, result } = await postQuickEntry({
          text,
          ...(useMemberId && { useMemberId }),
          ...(confirmDuplicate && { confirmDuplicate: true }),
          ...(verifyPhone?.trim() && { verifyPhone: verifyPhone.trim() }),
          ...(pendingMemberId && { pendingMemberId }),
        });

        if (res.status === 401) {
          onUnauthorized?.();
          return;
        }

        if (res.ok && result.success) {
          setQuickEntryResult(result);
          setQuickEntryVerifyPhone("");
          setQuickEntryPendingMemberId(null);
          if (result.bulk) {
            setLastBulkResponse((result.failed ?? 0) > 0 ? result : null);
          } else {
            setLastBulkResponse(null);
          }
          await onSuccess?.();
          scheduleClearIfDone(result);
          return;
        }

        if (result.needsPhoneVerification && result.pendingMemberId) {
          setQuickEntryPendingMemberId(result.pendingMemberId);
        }

        let next: QuickEntryResultState = result;
        if (res.status === 404) {
          next = { error: "Quick entry not available. Please refresh or try again." };
        } else if (res.status >= 500) {
          next = {
            error: "Server error. Please try again later.",
            details: result?.details || result?.error,
          };
        }
        setQuickEntryResult(next);
      } catch (err: unknown) {
        setQuickEntryResult({ error: "Failed to add payment", details: String(err) });
      } finally {
        setQuickEntryLoading(false);
      }
    },
    [onSuccess, onUnauthorized, postQuickEntry, scheduleClearIfDone]
  );

  const handleQuickEntry = useCallback(
    async (useMemberId?: string, confirmDuplicate?: boolean) => {
      await submitQuickEntryPayload({
        text: quickEntryText,
        clearResultFirst: !confirmDuplicate,
        useMemberId,
        confirmDuplicate,
        verifyPhone: quickEntryVerifyPhone,
        pendingMemberId: quickEntryPendingMemberId,
      });
    },
    [quickEntryText, quickEntryVerifyPhone, quickEntryPendingMemberId, submitQuickEntryPayload]
  );

  const postSingleLine = useCallback(
    async (
      entry: string,
      extra: {
        confirmDuplicate?: boolean;
        useMemberId?: string;
        verifyPhone?: string;
        pendingMemberId?: string;
      } = {}
    ) => {
      await submitQuickEntryPayload({
        text: entry,
        clearResultFirst: false,
        confirmDuplicate: extra.confirmDuplicate,
        useMemberId: extra.useMemberId,
        verifyPhone: extra.verifyPhone,
        pendingMemberId: extra.pendingMemberId ?? null,
      });
    },
    [submitQuickEntryPayload]
  );

  const dismissQuickEntryFull = useCallback(() => {
    setQuickEntryResult(null);
    setQuickEntryVerifyPhone("");
    setQuickEntryPendingMemberId(null);
    setQuickEntryText("");
    setLastBulkResponse(null);
  }, []);

  const handleCancelVerifyOverlay = useCallback(() => {
    setQuickEntryVerifyPhone("");
    setQuickEntryPendingMemberId(null);
    if (lastBulkResponse?.bulk) {
      setQuickEntryResult(lastBulkResponse);
    } else {
      setQuickEntryResult(null);
    }
  }, [lastBulkResponse]);

  const handleFixBulkLine = useCallback((entry: string) => {
    setQuickEntryText(entry);
    setIsBulkMode(false);
    setQuickEntryVerifyPhone("");
    setQuickEntryPendingMemberId(null);
    setQuickEntryResult(null);
  }, []);

  const resultPanelClass = (r: QuickEntryResultState) =>
    r.success
      ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
      : r.duplicate
        ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
        : "bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800";

  const renderQuickEntryResultBody = (): ReactNode => {
    const r = quickEntryResult;
    if (!r) return null;

    if (r.bulk) {
      return (
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-green-900 dark:text-green-100">
                Bulk: {r.processed ?? 0} recorded
                {(r.failed ?? 0) > 0 ? `, ${r.failed} failed` : ""}
              </p>
              {r.message && (
                <p className="text-xs text-green-800 dark:text-green-200 mt-0.5">{r.message}</p>
              )}
            </div>
            <Button
              type="button"
              onClick={dismissQuickEntryFull}
              className="shrink-0 p-1 rounded hover:bg-green-200/50 dark:hover:bg-green-800/30 text-green-800 dark:text-green-200"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {r.results && r.results.length > 0 && (
            <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
              <p className="text-xs font-semibold text-green-800 dark:text-green-200">Successful:</p>
              {r.results.map((row, idx) => (
                <div key={idx} className="text-xs text-green-700 dark:text-green-300 pl-6">
                  ✓ {row.member} — {row.methods || `₹${row.amount} ${row.method}`} ({row.date})
                </div>
              ))}
            </div>
          )}

          {r.errors && r.errors.length > 0 && (
            <div className="mt-2 space-y-2">
              <p className="text-xs font-semibold text-red-800 dark:text-red-200">Failed lines:</p>
              <p className="text-xs text-muted-foreground">
                Edit the textarea and run <span className="font-medium text-foreground">Process bulk</span> again, or use{" "}
                <span className="font-medium text-foreground">Single Mode</span> for one line.
              </p>
              {r.errors.map((errorRow, idx) => {
                const flagged =
                  errorRow.invalidDate ||
                  errorRow.invalidName ||
                  errorRow.needsPhoneInLine ||
                  errorRow.ambiguousMember;
                return (
                  <div
                    key={idx}
                    className={`text-xs text-red-800 dark:text-red-200 pl-2 py-2 rounded-md border space-y-1 ${
                      flagged
                        ? "bg-red-100 dark:bg-red-950/50 border-red-400 dark:border-red-700"
                        : "border-transparent"
                    }`}
                  >
                    <span className="font-mono block break-all">✗ {errorRow.entry}</span>
                    <span className="block">{errorRow.error}</span>
                    {errorRow.memberPreview && (
                      <span className="block text-red-700 dark:text-red-300">
                        Likely: {errorRow.memberPreview.name} ({errorRow.memberPreview.phoneMask})
                      </span>
                    )}
                    {errorRow.duplicate && errorRow.existingPayment && (
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-amber-700 dark:text-amber-400">
                          {errorRow.existingPayment.memberName ?? "Member"} already has{" "}
                          {formatCurrency(errorRow.existingPayment.amount)} on{" "}
                          {formatDate(String(errorRow.existingPayment.receivedAt))}.
                        </span>
                        <Button
                          type="button"
                          onClick={() => void postSingleLine(errorRow.entry, { confirmDuplicate: true })}
                          disabled={quickEntryLoading}
                          className="text-xs px-2 py-1 rounded bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                        >
                          Add anyway
                        </Button>
                      </div>
                    )}
                    {(errorRow.needsPhoneInLine ||
                      errorRow.ambiguousMember ||
                      (errorRow.similarNames && errorRow.similarNames.length > 0)) && (
                      <Button
                        type="button"
                        onClick={() => handleFixBulkLine(errorRow.entry)}
                        disabled={quickEntryLoading}
                        className="text-xs px-2 py-1 rounded border border-red-400 text-red-900 dark:text-red-100 hover:bg-red-200/40 dark:hover:bg-red-900/40 disabled:opacity-50"
                      >
                        Open in single-line mode
                      </Button>
                    )}
                    {errorRow.candidates && errorRow.candidates.length > 0 && (
                      <span className="block text-red-700 dark:text-red-300">
                        Matches: {errorRow.candidates.map((c) => c.name).join(", ")}
                      </span>
                    )}
                    {errorRow.similarNames && errorRow.similarNames.length > 0 && (
                      <span className="block text-red-600 dark:text-red-400">
                        Similar: {errorRow.similarNames.map((s) => s.name).join(", ")}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    if (r.duplicate) {
      return (
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-amber-900 dark:text-amber-100">Possible duplicate</p>
            <p className="text-xs text-amber-800 dark:text-amber-200 mt-0.5">
              {r.existingPayment?.memberName ?? "Member"} already has{" "}
              {formatCurrency(r.existingPayment?.amount ?? 0)} on{" "}
              {formatDate(r.existingPayment?.receivedAt ?? new Date().toISOString())}.
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">{r.suggestion}</p>
            <div className="flex gap-2 mt-2">
              <Button
                type="button"
                onClick={() => void handleQuickEntry(undefined, true)}
                disabled={quickEntryLoading}
                className="text-xs px-2 py-1 rounded bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
              >
                Add anyway
              </Button>
              <Button
                type="button"
                onClick={dismissQuickEntryFull}
                className="text-xs px-2 py-1 rounded border border-amber-300 text-amber-800 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              >
                Discard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (r.needsPhoneVerification || r.ambiguousMember) {
      return (
        <div className="flex flex-col gap-3">
          {lastBulkResponse?.bulk === true && (lastBulkResponse.failed ?? 0) > 0 && (
            <div className="text-xs rounded-md border border-purple-300/80 dark:border-purple-700 bg-purple-100/50 dark:bg-purple-950/40 px-2 py-1.5 text-purple-900 dark:text-purple-100">
              After verify, <span className="font-medium">Cancel</span> restores the last bulk summary (
              {lastBulkResponse.failed} failed line(s)).
            </div>
          )}
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-red-900 dark:text-red-100">Verify member</p>
              <p className="text-xs text-red-800 dark:text-red-200 mt-0.5">{r.error}</p>
              {r.suggestion && (
                <p className="text-xs text-red-700 dark:text-red-300 mt-1">{r.suggestion}</p>
              )}
              {r.phoneMask && (
                <p className="text-xs font-mono mt-1 text-red-800 dark:text-red-200">
                  Registered: {r.phoneMask}
                </p>
              )}
            </div>
          </div>
          {r.ambiguousMember && r.candidates && r.candidates.length > 0 && (
            <div className="space-y-2 pl-6">
              <p className="text-xs font-semibold text-red-800 dark:text-red-200">Pick the correct member:</p>
              {r.candidates.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-red-800 dark:text-red-200">
                    {c.name} ({c.phone})
                  </span>
                  <Button
                    type="button"
                    onClick={() => {
                      setQuickEntryVerifyPhone("");
                      void handleQuickEntry(c.id);
                    }}
                    disabled={quickEntryLoading}
                    className="text-xs px-2 py-0.5 rounded bg-red-700 text-white hover:bg-red-800 disabled:opacity-50"
                  >
                    This one — then verify phone
                  </Button>
                </div>
              ))}
            </div>
          )}
          {r.needsPhoneVerification && (
            <div className="flex flex-col sm:flex-row gap-2 pl-6 items-stretch sm:items-end">
              <div className="flex-1 min-w-0">
                <label
                  htmlFor="quick-entry-phone-verify"
                  className="text-xs font-medium text-red-800 dark:text-red-200 block mb-1"
                >
                  Last 4 digits or full phone
                </label>
                <Input
                  id="quick-entry-phone-verify"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="e.g. 0895"
                  value={quickEntryVerifyPhone}
                  onChange={(e) => setQuickEntryVerifyPhone(e.target.value)}
                  className="h-9 text-sm border-red-300 dark:border-red-700"
                  disabled={quickEntryLoading}
                />
              </div>
              <Button
                type="button"
                onClick={() => void handleQuickEntry()}
                disabled={quickEntryLoading || !quickEntryVerifyPhone.trim()}
                className="text-sm px-3 py-2 rounded-lg bg-red-700 text-white hover:bg-red-800 disabled:opacity-50 shrink-0"
              >
                Verify & add payment
              </Button>
            </div>
          )}
          <Button
            type="button"
            onClick={handleCancelVerifyOverlay}
            className="text-xs text-red-700 dark:text-red-300 underline self-start pl-6"
          >
            Cancel
          </Button>
        </div>
      );
    }

    return (
      <div className="flex items-start gap-2">
        {r.success ? (
          <>
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-green-900 dark:text-green-100">Added successfully</p>
              <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                {r.message ||
                  `${r.payment?.Member?.name} — ${formatCurrency(Number(r.payment?.amount))} via ${r.payment?.method}`}
              </p>
            </div>
          </>
        ) : (
          <>
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-900 dark:text-red-100">Failed</p>
              <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">{r.error}</p>
              {(r.invalidDate || r.invalidName) && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  Fix the date or name in your text and try again.
                </p>
              )}
              {r.phoneMismatch && quickEntryPendingMemberId && (
                <div className="mt-2 flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="Retry last 4 / full phone"
                    value={quickEntryVerifyPhone}
                    onChange={(e) => setQuickEntryVerifyPhone(e.target.value)}
                    className="h-9 text-sm max-w-xs border-red-300"
                    disabled={quickEntryLoading}
                  />
                  <Button
                    type="button"
                    onClick={() => void handleQuickEntry()}
                    disabled={quickEntryLoading || !quickEntryVerifyPhone.trim()}
                    className="text-xs px-3 py-2 rounded bg-red-700 text-white hover:bg-red-800 disabled:opacity-50"
                  >
                    Retry verify
                  </Button>
                </div>
              )}
              {r.similarNames && r.similarNames.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-semibold text-red-800 dark:text-red-200">Did you mean?</p>
                  <p className="text-xs text-red-700 dark:text-red-300 mb-1">
                    Verify phone before the payment is saved.
                  </p>
                  {r.similarNames.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-red-700 dark:text-red-300">
                        {s.name} ({s.phone})
                      </span>
                      <Button
                        type="button"
                        onClick={() => {
                          setQuickEntryVerifyPhone("");
                          void handleQuickEntry(s.id);
                        }}
                        className="text-xs px-2 py-0.5 rounded bg-green-600 text-white hover:bg-green-700"
                      >
                        Use this
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setQuickEntryResult(null)}
                        className="text-xs px-2 py-0.5 rounded border border-red-300 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        Ignore
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  if (!open) return null;

  return (
    <Card className="border-purple-200 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-950/20 rounded-lg relative z-10">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-purple-600 shrink-0" />
            <span>Quick Entry</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={() => setIsBulkMode(!isBulkMode)}
              className="text-xs px-2 py-1 rounded border border-purple-300 dark:border-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
            >
              {isBulkMode ? "Single Mode" : "Bulk Mode"}
            </Button>
            <Badge variant="outline" className="text-xs">
              Natural Language
            </Badge>
          </div>
        </div>
        <CardDescription className="text-xs mt-2">
          {isBulkMode ? (
            <>
              <span className="font-semibold">Bulk:</span> One payment per line or comma-separated. Optional{" "}
              <code className="text-[10px] bg-muted px-1 rounded">all dates …</code> for a shared date.
              <p className="text-xs text-muted-foreground mt-2">
                If lines fail, edit the textarea and run <span className="font-medium text-foreground">Process bulk</span>{" "}
                again. Use <span className="font-medium text-foreground">Single Mode</span> for one line (verify phone,
                duplicates). <span className="font-medium text-foreground">Cancel</span> on verify returns to the last bulk
                summary when available.
              </p>
              <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-x-auto">
                {`Renewal Piyush Singh 700 UPI 14/03/2026,
Renewal Aman 700 Cash 16/03/2026,
New Admission Prem 699 UPI 17/03/2026 8583946189
all dates 16th March`}
              </pre>
            </>
          ) : (
            <>
              <span className="font-semibold">Format:</span> amount method [amount method] renewal/monthly name
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-muted-foreground">
                <li className="truncate">&quot;400 cash 299 online renewal Mukesh Kumar Shaw&quot;</li>
                <li className="truncate">&quot;799 upi monthly John Doe&quot;</li>
                <li className="truncate">&quot;1500 cash admission Priya Sharma&quot;</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-2 italic">
                &quot;online&quot; = UPI · Dates default to today · Names in any script (not numbers-only)
              </p>
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 px-3 pb-3">
        <div className="flex flex-col gap-2">
          {isBulkMode ? (
            <Textarea
              value={quickEntryText}
              onChange={(e) => setQuickEntryText(e.target.value)}
              placeholder={`Renewal Name 700 UPI 16/03/2026,\nNew Admission Name 699 UPI 17/03/2026 8583946189\nall dates 16th March`}
              className="w-full px-3 py-2 text-sm border border-input rounded-lg focus:ring-2 focus:ring-ring bg-background text-foreground placeholder:text-xs resize-none"
              rows={5}
              disabled={quickEntryLoading}
            />
          ) : (
            <Input
              type="text"
              value={quickEntryText}
              onChange={(e) => setQuickEntryText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !quickEntryLoading && quickEntryText.trim()) {
                  e.preventDefault();
                  void handleQuickEntry();
                }
              }}
              placeholder="400 cash 299 online renewal Mukesh Kumar Shaw"
              className="flex-1 px-3 py-2 text-sm border border-input rounded-lg focus:ring-2 focus:ring-ring bg-background text-foreground placeholder:text-xs sm:placeholder:text-sm"
              disabled={quickEntryLoading}
            />
          )}
          <Button
            type="button"
            onClick={() => void handleQuickEntry()}
            disabled={quickEntryLoading || !quickEntryText.trim()}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-all disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            {quickEntryLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>{isBulkMode ? "Processing…" : "Adding…"}</span>
              </>
            ) : (
              <>
                <Zap className="h-3.5 w-3.5" />
                <span>{isBulkMode ? "Process bulk" : "Add"}</span>
              </>
            )}
          </Button>
        </div>

        {quickEntryResult && (
          <div className={`p-3 rounded-lg border text-sm ${resultPanelClass(quickEntryResult)}`}>
            {renderQuickEntryResultBody()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
