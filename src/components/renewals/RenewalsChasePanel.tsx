"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Target,
  Loader2,
  ChevronRight,
  AlertTriangle,
  Send,
  RefreshCw,
  ListOrdered,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { ApprovalsQueuePanel } from "@/components/approvals/ApprovalsQueuePanel";

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error("Failed to load");
  return r.json();
});

type PredictionFilter = "ALL" | "LIKELY_TO_PAY" | "AT_RISK" | "UNLIKELY";

type ChaseStep = {
  order: number;
  opportunityId: string;
  memberId: string;
  memberName: string;
  memberPhone: string | null;
  priority: string;
  score: number;
  amountAtRisk: number;
  reasons: string[];
  isOverdue: boolean;
  readinessScore?: number;
  payProbability: number;
  churnRisk: number;
  predictionLabel: "LIKELY_TO_PAY" | "AT_RISK" | "UNLIKELY";
  outcomeSummary: string;
  inferenceSource?: "RULES" | "LLM" | "HYBRID";
  llmRationale?: string | null;
  llmRecommendedAction?: string | null;
  llmError?: string | null;
  suggestedOfferName?: string;
};

type ChasePlan = {
  summary: {
    openCount: number;
    highPriorityCount: number;
    recoverableRevenue: number;
    likelyToPayCount?: number;
    atRiskCount?: number;
    unlikelyCount?: number;
  };
  predictions?: {
    likelyToPay: number;
    atRisk: number;
    unlikely: number;
  };
  steps: ChaseStep[];
  calibration?: {
    modelVersion: string;
    sampleSize: number;
    recoveryRate: number;
    paymentWithin7dRate: number;
  };
  inference?: {
    llmAssessedCount: number;
    enabled: boolean;
    isDevMock?: boolean;
    provider?: string | null;
    model?: string | null;
    hint?: string | null;
  };
  cohortBrief?: {
    headline?: string;
    focusToday?: string[];
    avoidWastingTimeOn?: string;
  } | null;
};

const READINESS_LABELS: Record<
  Exclude<PredictionFilter, "ALL">,
  { short: string; badge: "default" | "secondary" | "destructive" | "outline" }
> = {
  LIKELY_TO_PAY: { short: "High readiness", badge: "default" },
  AT_RISK: { short: "Mixed", badge: "secondary" },
  UNLIKELY: { short: "Low readiness", badge: "destructive" },
};

type GoalResponse = {
  goal: {
    id: string;
    title: string;
    targetInr: string | number;
    recoveredInr: string | number;
    status: string;
  } | null;
};

export function RenewalsChasePanel() {
  const [predictionFilter, setPredictionFilter] = useState<PredictionFilter>("ALL");
  const [refreshingPredictions, setRefreshingPredictions] = useState(false);
  const [refreshHint, setRefreshHint] = useState<string | null>(null);

  const chaseUrl =
    predictionFilter === "ALL"
      ? "/api/opportunities/chase-plan?limit=15"
      : `/api/opportunities/chase-plan?limit=15&prediction=${predictionFilter}`;

  const { data: plan, isLoading, mutate } = useSWR<ChasePlan>(chaseUrl, fetcher);
  const { data: goalData, mutate: mutateGoal } = useSWR<GoalResponse>("/api/goals", fetcher);
  const [targetInput, setTargetInput] = useState("");
  const [savingGoal, setSavingGoal] = useState(false);
  const [bulkPreview, setBulkPreview] = useState<{
    total: number;
    drafts: { memberId: string; memberName: string; message: string }[];
  } | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);

  const createGoal = async () => {
    const targetInr = Number(targetInput.replace(/,/g, ""));
    if (!targetInr || targetInr <= 0) return;
    setSavingGoal(true);
    try {
      await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetInr }),
      });
      setTargetInput("");
      await mutateGoal();
    } finally {
      setSavingGoal(false);
    }
  };

  const goal = goalData?.goal;
  const recovered = goal ? Number(goal.recoveredInr) : 0;
  const target = goal ? Number(goal.targetInr) : 0;
  const progressPct = target > 0 ? Math.min(100, Math.round((recovered / target) * 100)) : 0;

  const cohort = plan?.predictions ?? {
    likelyToPay: plan?.summary.likelyToPayCount ?? 0,
    atRisk: plan?.summary.atRiskCount ?? 0,
    unlikely: plan?.summary.unlikelyCount ?? 0,
  };

  const chaseMemberIds =
    plan?.steps
      .filter(
        (s) =>
          s.predictionLabel === "LIKELY_TO_PAY" ||
          s.priority === "HIGH" ||
          s.isOverdue,
      )
      .map((s) => s.memberId)
      .slice(0, 20) ?? [];

  const refreshPredictions = async () => {
    setRefreshingPredictions(true);
    setRefreshHint(null);
    try {
      const res = await fetch("/api/predictions/refresh", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setRefreshHint(data.error ?? "Recompute failed");
      } else if (!data.llmEnabled && data.inferenceHint) {
        setRefreshHint(data.inferenceHint);
      } else if (data.llmEnabled) {
        const mock = data.isDevMock ? " (dev mock — add API key for live LLM)" : "";
        setRefreshHint(
          `LLM assessed ${data.llmAssessed ?? 0} members via ${data.inferenceProvider ?? "llm"}${mock}.` +
            (data.llmFailed > 0 ? ` ${data.llmFailed} fell back to rules.` : ""),
        );
      }
      await mutate();
    } finally {
      setRefreshingPredictions(false);
    }
  };

  const inference = plan?.inference;
  const aiEnabled = inference?.enabled ?? false;
  const queueTitle = aiEnabled
    ? inference?.isDevMock
      ? "Recovery readiness (dev mock LLM)"
      : `Recovery readiness (LLM: ${inference?.provider ?? "ai"})`
    : "Recovery readiness (rules only)";

  const inferenceHint =
    refreshHint ??
    (plan?.inference?.enabled === false ? plan.inference.hint ?? null : null);

  const previewBulk = async () => {
    if (chaseMemberIds.length === 0) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/renewals/send-bulk-reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberIds: chaseMemberIds, previewOnly: true }),
      });
      if (!res.ok) throw new Error("preview failed");
      const json = await res.json();
      setBulkPreview({ total: json.total, drafts: json.drafts });
    } finally {
      setBulkLoading(false);
    }
  };

  const confirmBulkSend = async () => {
    if (!chaseMemberIds.length) return;
    setBulkSending(true);
    try {
      await fetch("/api/renewals/send-bulk-reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberIds: chaseMemberIds, confirmed: true }),
      });
      setBulkPreview(null);
      await mutate();
    } finally {
      setBulkSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <ApprovalsQueuePanel />
      {goal && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              {goal.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Recovered</span>
              <span className="font-semibold">
                {formatCurrency(recovered)} / {formatCurrency(target)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{progressPct}% of goal</p>
          </CardContent>
        </Card>
      )}

      {!goal && (
        <Card>
          <CardContent className="pt-4 flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Recovery goal (₹), e.g. 100000"
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              className="flex-1"
            />
            <Button onClick={createGoal} disabled={savingGoal}>
              {savingGoal ? <Loader2 className="h-4 w-4 animate-spin" /> : "Set goal"}
            </Button>
          </CardContent>
        </Card>
      )}

      {inferenceHint && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="pt-4 pb-4 text-sm text-amber-900 dark:text-amber-200">
            {inferenceHint}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2 flex flex-col gap-3">
          <div className="flex flex-row items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-lg flex items-center gap-2">
              <ListOrdered className="h-4 w-4 text-primary" />
              {queueTitle}
            </CardTitle>
            <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshPredictions}
              disabled={refreshingPredictions}
            >
              {refreshingPredictions ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Recompute
                </>
              )}
            </Button>
            {chaseMemberIds.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={previewBulk}
                disabled={bulkLoading || bulkSending}
              >
                {bulkLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-1" />
                    Preview bulk ({chaseMemberIds.length})
                  </>
                )}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => mutate()}>
              Refresh
            </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["ALL", "All", plan?.summary.openCount],
                ["LIKELY_TO_PAY", "High readiness", cohort.likelyToPay],
                ["AT_RISK", "Mixed", cohort.atRisk],
                ["UNLIKELY", "Low readiness", cohort.unlikely],
              ] as const
            ).map(([key, label, count]) => (
              <Button
                key={key}
                size="sm"
                variant={predictionFilter === key ? "default" : "outline"}
                onClick={() => setPredictionFilter(key)}
              >
                {label}
                {count != null ? ` (${count})` : ""}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading ranked list…
            </p>
          )}
          {!isLoading && plan && (
            <>
              <p className="text-sm text-muted-foreground mb-1">
                {plan.summary.openCount} open · {cohort.likelyToPay} high readiness ·{" "}
                {formatCurrency(plan.summary.recoverableRevenue)} at risk
              </p>
              {plan.cohortBrief?.headline && (
                <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 mb-3 text-sm">
                  <p className="font-medium">{plan.cohortBrief.headline}</p>
                  {plan.cohortBrief.focusToday && plan.cohortBrief.focusToday.length > 0 && (
                    <ul className="mt-2 text-xs text-muted-foreground list-disc list-inside">
                      {plan.cohortBrief.focusToday.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground mb-3">
                {aiEnabled
                  ? `Top ${plan.inference?.llmAssessedCount ?? 0} rows assessed with AI SDK generateObject; others use rules only.`
                  : "Rules-only mode — add FITNESS360_AI_API_KEY or ANTHROPIC_API_KEY to .env.local."}
                {plan.calibration && plan.calibration.sampleSize >= 5
                  ? ` Gym recovery ${Math.round(plan.calibration.recoveryRate * 100)}% (n=${plan.calibration.sampleSize}).`
                  : ""}
              </p>
              {plan.steps.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No members in this cohort. Try another filter or run Recompute.
                </p>
              ) : (
                <ul className="space-y-2">
                  {plan.steps.map((step) => (
                    <li
                      key={step.opportunityId}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/40 transition-colors"
                    >
                      <span className="text-xs font-mono text-muted-foreground w-6 pt-0.5">
                        {step.order}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/dashboard/members/${step.memberId}`}
                            className="font-semibold text-foreground hover:underline truncate"
                          >
                            {step.memberName}
                          </Link>
                          <Badge
                            variant={
                              step.priority === "HIGH"
                                ? "destructive"
                                : step.priority === "MEDIUM"
                                  ? "default"
                                  : "secondary"
                            }
                          >
                            {step.priority}
                          </Badge>
                          {step.isOverdue && (
                            <Badge variant="outline" className="gap-1" asChild>
                              <Link href="/dashboard/overdue">
                                <AlertTriangle className="h-3 w-3" />
                                Overdue
                              </Link>
                            </Badge>
                          )}
                          <Badge
                            variant={
                              READINESS_LABELS[step.predictionLabel].badge
                            }
                            className="text-xs"
                          >
                            {READINESS_LABELS[step.predictionLabel].short} ·{" "}
                            {step.readinessScore ?? step.payProbability}/100
                          </Badge>
                          {step.inferenceSource === "LLM" && (
                            <Badge variant="outline" className="text-xs">
                              {plan.inference?.isDevMock ? "Mock LLM" : "LLM"}
                            </Badge>
                          )}
                          {step.suggestedOfferName && (
                            <Badge variant="secondary" className="text-xs">
                              Offer: {step.suggestedOfferName}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground ml-auto">
                            {formatCurrency(step.amountAtRisk)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs font-medium text-foreground/90">
                          {step.llmRationale ?? step.outcomeSummary}
                        </p>
                        {step.llmRecommendedAction && (
                          <p className="text-xs text-muted-foreground">
                            Suggested: {step.llmRecommendedAction.replace(/_/g, " ")}
                          </p>
                        )}
                        {step.llmError && (
                          <p className="text-xs text-destructive">
                            LLM failed: {step.llmError}
                          </p>
                        )}
                        <ul className="mt-1 text-xs text-muted-foreground list-disc list-inside">
                          {step.reasons.slice(0, 3).map((r) => (
                            <li key={r}>{r}</li>
                          ))}
                        </ul>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {bulkPreview && (
        <Card className="border-amber-500/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Bulk send preview</CardTitle>
            <p className="text-xs text-muted-foreground">
              {bulkPreview.total} messages — confirm before sending
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="max-h-48 overflow-y-auto text-xs space-y-2">
              {bulkPreview.drafts.slice(0, 5).map((d) => (
                <li key={d.memberId} className="border rounded p-2">
                  <strong>{d.memberName}</strong>
                  <p className="text-muted-foreground mt-1 line-clamp-2">{d.message}</p>
                </li>
              ))}
              {bulkPreview.drafts.length > 5 && (
                <li className="text-muted-foreground">
                  +{bulkPreview.drafts.length - 5} more…
                </li>
              )}
            </ul>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={confirmBulkSend}
                disabled={bulkSending}
              >
                {bulkSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Confirm & send"
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBulkPreview(null)}
                disabled={bulkSending}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
