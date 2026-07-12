"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Trash2, Ticket, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, cn } from "@/lib/utils";
import type { FreeTrialVisitDto } from "@/lib/free-trial-visit-api";
import { toast } from "sonner";

type WalkInKind = "FREE_TRIAL" | "DAY_PASS";

type PhoneSummary = {
  phone: string;
  freeTrialUsed: number;
  freeTrialRemaining: number;
  freeTrialMaxLifetime: number;
};

function todayYmdLocal(): string {
  return new Date().toISOString().slice(0, 10);
}

function unwrapPayload<T>(raw: unknown): T | null {
  if (!raw || typeof raw !== "object") return null;
  const root = raw as { success?: boolean; data?: T };
  if (root.success === true && root.data != null) return root.data;
  return raw as T;
}

function unwrapError(raw: unknown, fallback: string): string {
  if (typeof raw === "object" && raw !== null) {
    const o = raw as { error?: string; message?: string };
    if (o.error) return o.error;
    if (o.message) return o.message;
  }
  return fallback;
}

export function WalkInVisitsPanel({
  visitDate,
  visits: visitsProp,
  loadingVisits = false,
  onRecordsChanged,
}: {
  visitDate: string;
  visits: FreeTrialVisitDto[];
  loadingVisits?: boolean;
  onRecordsChanged?: () => void;
}) {
  const visits = visitsProp;
  const loadingList = loadingVisits;
  const [kind, setKind] = useState<WalkInKind>("FREE_TRIAL");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<PhoneSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPhoneSummary = useCallback(async (phoneInput: string) => {
    const digits = phoneInput.replace(/\D/g, "");
    if (digits.length < 10) {
      setSummary(null);
      return;
    }
    setSummaryLoading(true);
    try {
      const res = await fetch(
        `/api/free-trial-visits?phone=${encodeURIComponent(phoneInput)}`
      );
      const data = await res.json().catch(() => ({}));
      const payload = unwrapPayload<{ summary?: PhoneSummary }>(data);
      setSummary(payload?.summary ?? null);
    } catch {
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (kind !== "FREE_TRIAL") {
      setSummary(null);
      return;
    }
    const t = setTimeout(() => void fetchPhoneSummary(phone), 400);
    return () => clearTimeout(t);
  }, [phone, kind, fetchPhoneSummary]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error("Name and phone are required");
      return;
    }
    if (kind === "DAY_PASS") {
      const n = parseFloat(amount);
      if (!Number.isFinite(n) || n <= 0) {
        toast.error("Enter a valid day pass amount");
        return;
      }
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        kind,
        name: name.trim(),
        phone: phone.trim(),
        visitDate,
        notes: notes.trim() || null,
      };
      if (kind === "DAY_PASS") {
        body.amount = parseFloat(amount);
      }

      const res = await fetch("/api/free-trial-visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(unwrapError(data, "Failed to save"));
      }

      toast.success(
        kind === "FREE_TRIAL" ? "Free trial recorded" : "Day pass recorded"
      );
      setName("");
      setPhone("");
      setAmount("");
      setNotes("");
      setSummary(null);
      onRecordsChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this walk-in entry?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/free-trial-visits/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(unwrapError(data, "Failed to delete"));
      }
      toast.success("Entry removed");
      onRecordsChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

  const todayYmd = todayYmdLocal();
  const isPastOrToday = visitDate <= todayYmd;

  return (
    <Card className="border-amber-200/60 dark:border-amber-800/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-600" />
          Free trial &amp; day pass
        </CardTitle>
        <CardDescription>
          Free trial: max 2 per phone (lifetime). Day pass: flexible amount for one visit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={kind === "FREE_TRIAL" ? "default" : "outline"}
            onClick={() => setKind("FREE_TRIAL")}
          >
            Free trial
          </Button>
          <Button
            type="button"
            size="sm"
            variant={kind === "DAY_PASS" ? "default" : "outline"}
            onClick={() => setKind("DAY_PASS")}
          >
            <Ticket className="h-3.5 w-3.5 mr-1" />
            Day pass
          </Button>
        </div>

        {isPastOrToday ? (
          <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="walkin-name">Full name *</Label>
              <Input
                id="walkin-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Visitor name"
                className="uppercase"
                required
              />
            </div>
            <div>
              <Label htmlFor="walkin-phone">Phone *</Label>
              <Input
                id="walkin-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile"
                inputMode="tel"
                required
              />
              {kind === "FREE_TRIAL" && phone.replace(/\D/g, "").length >= 10 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {summaryLoading ? (
                    "Checking free trials…"
                  ) : summary ? (
                    <>
                      Free trials used: {summary.freeTrialUsed} / {summary.freeTrialMaxLifetime}
                      {summary.freeTrialRemaining === 0 ? (
                        <span className="text-destructive font-medium"> — limit reached</span>
                      ) : (
                        <span> — {summary.freeTrialRemaining} remaining</span>
                      )}
                    </>
                  ) : null}
                </p>
              )}
            </div>
            {kind === "DAY_PASS" ? (
              <div>
                <Label htmlFor="walkin-amount">Amount (₹) *</Label>
                <Input
                  id="walkin-amount"
                  type="number"
                  min={1}
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 200"
                  required
                />
              </div>
            ) : (
              <div className="hidden sm:block" aria-hidden />
            )}
            <div className="sm:col-span-2">
              <Label htmlFor="walkin-notes">Notes (optional)</Label>
              <Textarea
                id="walkin-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Referral, trainer intro, etc."
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving…
                  </>
                ) : kind === "FREE_TRIAL" ? (
                  "Record free trial"
                ) : (
                  "Record day pass"
                )}
              </Button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            Walk-ins can only be recorded for today or a past date.
          </p>
        )}

        <div className="border-t border-border pt-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Logged for {visitDate}
          </div>
          {loadingList ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : visits.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No free trials or day passes this day.
            </p>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {visits.map((v) => (
                <li
                  key={v.id}
                  className="flex items-start justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium uppercase truncate">
                        {v.name}
                      </span>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px]",
                          v.kind === "FREE_TRIAL"
                            ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
                            : "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100"
                        )}
                      >
                        {v.kind === "FREE_TRIAL" ? "Free trial" : "Day pass"}
                      </Badge>
                      {v.kind === "DAY_PASS" && v.amount != null && (
                        <span className="text-xs font-semibold text-foreground">
                          {formatCurrency(v.amount)}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground tabular-nums">{v.phone}</div>
                    {v.notes ? (
                      <div className="text-xs text-muted-foreground mt-0.5 truncate" title={v.notes}>
                        {v.notes}
                      </div>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    disabled={deletingId === v.id}
                    onClick={() => void handleDelete(v.id)}
                    title="Remove entry"
                  >
                    {deletingId === v.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
