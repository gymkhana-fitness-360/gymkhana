"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate, formatCurrency, getDaysUntil } from "@/lib/utils";
import Link from "next/link";
import {
  Calendar,
  RefreshCw,
  Receipt,
  UserPlus,
  Dumbbell,
  Loader2,
  CheckCircle,
  X,
  AlertCircle,
  Send,
  Zap,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckboxInput } from "@/components/ui/checkbox-input";
import { useActionQueue } from "@/hooks/use-action-queue";
import {
  DashboardQuickEntryButton,
  DashboardQuickEntryPanel,
} from "@/components/dashboard/dashboard-quick-entry";
import useSWR, { mutate as globalMutate } from "swr";
import { createLogger } from "@/lib/logger";
import { triggerPaymentUpdate } from "@/lib/sidebar-events";
import { RenewalsChasePanel } from "@/components/renewals/RenewalsChasePanel";
import { MessagingKanbanPanel } from "@/components/messaging/MessagingKanbanPanel";
import { LeadsFollowUpPanel } from "@/components/leads/LeadsFollowUpPanel";

const logger = createLogger("dashboard-renewals");

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to fetch data");
  }
  return res.json();
};

interface Membership {
  id: string;
  memberId: string;
  startDate: string;
  endDate: string;
  amount: number;
  Member: {
    id: string;
    name: string;
    phone: string;
  };
  Plan: {
    name: string;
  };
}

interface RenewalsData {
  today: Membership[];
  thisWeek: Membership[];
  thisMonth: Membership[];
  pending10Days: Membership[];
  pending20Days: Membership[];
  totalDueThisMonth?: number;
}

export default function RenewalsPage() {
  const router = useRouter();
  const { data: renewals, isLoading, mutate } = useSWR<RenewalsData>("/api/renewals", fetcher);
  const [showQuickEntry, setShowQuickEntry] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const handleRefresh = async () => {
    await mutate();
  };

  const toggleCard = (cardId: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(cardId)) {
      newExpanded.delete(cardId);
    } else {
      newExpanded.add(cardId);
    }
    setExpandedCards(newExpanded);
  };

  if (isLoading || !renewals) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Renewals</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track upcoming and overdue membership renewals
            </p>
          </div>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading renewals...</p>
        </div>
      </div>
    );
  }

  const columns = [
    {
      id: "today",
      title: "Due Today & Past",
      count: renewals.today.length,
      memberships: renewals.today,
      color: "red",
      icon: AlertCircle,
    },
    {
      id: "thisWeek",
      title: "This Week",
      count: renewals.thisWeek.length,
      memberships: renewals.thisWeek,
      color: "yellow",
      icon: Calendar,
    },
    {
      id: "thisMonth",
      title: "This Month",
      count: renewals.thisMonth.length,
      memberships: renewals.thisMonth,
      color: "blue",
      icon: Calendar,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">Renewals</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Track upcoming and overdue membership renewals
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DashboardQuickEntryButton
            open={showQuickEntry}
            onOpenChange={setShowQuickEntry}
            className="font-semibold shadow-sm"
          />
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            variant="secondary"
            className="font-semibold shadow-sm"
          >
            <RefreshCw className={`h-5 w-5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <DashboardQuickEntryPanel
        open={showQuickEntry}
        onUnauthorized={() => router.replace("/login?callbackUrl=/dashboard/renewals")}
        onSuccess={async () => {
          await mutate();
          globalMutate((key) => typeof key === "string" && key.startsWith("/api/members"));
          globalMutate((key) => typeof key === "string" && key.startsWith("/api/payments"));
          globalMutate((key) => typeof key === "string" && key.startsWith("/api/overdue"));
          globalMutate("/api/goals");
          globalMutate("/api/opportunities/chase-plan");
          triggerPaymentUpdate();
        }}
      />

      <RenewalsChasePanel />
      <LeadsFollowUpPanel compact />
      <MessagingKanbanPanel />

      {/* Kanban Board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            expandedCards={expandedCards}
            onToggleCard={toggleCard}
            selected={selected}
            onToggleSelect={(id) => {
              const newSelected = new Set(selected);
              if (newSelected.has(id)) {
                newSelected.delete(id);
              } else {
                newSelected.add(id);
              }
              setSelected(newSelected);
            }}
            onRefresh={mutate}
          />
        ))}
      </div>
    </div>
  );
}

function KanbanColumn({
  column,
  expandedCards,
  onToggleCard,
  selected,
  onToggleSelect,
  onRefresh,
}: {
  column: {
    id: string;
    title: string;
    count: number;
    memberships: Membership[];
    color: string;
    icon: any;
  };
  expandedCards: Set<string>;
  onToggleCard: (id: string) => void;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onRefresh: () => void;
}) {
  const colorClasses = {
    red: "border-red-200 dark:border-red-800 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20",
    yellow: "border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20",
    blue: "border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20",
    gray: "border-border bg-gradient-to-br from-muted to-muted/80",
  };

  const textColorClasses = {
    red: "text-red-700 dark:text-red-300",
    yellow: "text-amber-700 dark:text-amber-300",
    blue: "text-blue-700 dark:text-blue-300",
    gray: "text-muted-foreground",
  };

  const Icon = column.icon;

  return (
    <div className="flex flex-col h-full">
      {/* Column Header */}
      <div className={`rounded-t-xl border-2 border-b-0 p-4 ${colorClasses[column.color as keyof typeof colorClasses]}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-white/50 dark:bg-black/20">
              <Icon className={`h-5 w-5 ${textColorClasses[column.color as keyof typeof textColorClasses]}`} />
            </div>
            <h3 className={`text-sm font-bold uppercase tracking-wide ${textColorClasses[column.color as keyof typeof textColorClasses]}`}>
              {column.title}
            </h3>
          </div>
          <Badge variant="secondary" className="text-lg font-bold px-3 py-1">
            {column.count}
          </Badge>
        </div>
      </div>

      {/* Column Content */}
      <div className="flex-1 border-2 border-t-0 rounded-b-xl border-border bg-background/50 overflow-y-auto max-h-[600px]">
        {column.count === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No renewals</p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {column.memberships.map((membership) => (
              <CollapsibleKanbanCard
                key={membership.id}
                membership={membership}
                expanded={expandedCards.has(membership.id)}
                onToggle={() => onToggleCard(membership.id)}
                selected={selected.has(membership.id)}
                onToggleSelect={() => onToggleSelect(membership.id)}
                onRefresh={onRefresh}
                isOverdue={column.id === "today"}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CollapsibleKanbanCard({
  membership,
  expanded,
  onToggle,
  selected,
  onToggleSelect,
  onRefresh,
  isOverdue,
}: {
  membership: Membership;
  expanded: boolean;
  onToggle: () => void;
  selected: boolean;
  onToggleSelect: () => void;
  onRefresh: () => void;
  isOverdue: boolean;
}) {
  const [sendingReminder, setSendingReminder] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [draftMessage, setDraftMessage] = useState<string | null>(null);
  const [reminderResult, setReminderResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);
  const { enqueueAction, isQueued } = useActionQueue();

  const daysUntil = getDaysUntil(membership.endDate);
  const daysText = isOverdue
    ? `${Math.abs(daysUntil)}d overdue`
    : daysUntil === 0
    ? "Today"
    : `${daysUntil}d`;

  const loadDraft = async () => {
    setLoadingDraft(true);
    try {
      const res = await fetch("/api/ai/whatsapp/draft-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: membership.memberId }),
      });
      const data = await res.json();
      setDraftMessage(data.draft ?? null);
    } catch {
      setDraftMessage(null);
    } finally {
      setLoadingDraft(false);
    }
  };

  const sendReminder = async () => {
    let preview = draftMessage;
    if (!preview) {
      setLoadingDraft(true);
      try {
        const res = await fetch("/api/ai/whatsapp/draft-reminder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId: membership.memberId }),
        });
        const data = await res.json();
        preview = data.draft ?? null;
        setDraftMessage(preview);
      } finally {
        setLoadingDraft(false);
      }
    }
    const confirmText =
      preview ??
      `Send renewal reminder to ${membership.Member.name}?`;
    if (!window.confirm(`Send this WhatsApp reminder?\n\n${confirmText}`)) {
      return;
    }

    enqueueAction(`send-renewal-reminder:${membership.id}`, async () => {
      setSendingReminder(true);
      setReminderResult(null);
      try {
        const res = await fetch("/api/renewals/send-reminder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            memberId: membership.memberId,
            membershipId: membership.id,
            confirmed: true,
          }),
        });
        const result = await res.json();
        setReminderResult(result);
        if (result.success) {
          globalMutate("/api/goals");
          globalMutate("/api/opportunities/chase-plan");
          setTimeout(() => setReminderResult(null), 3000);
        }
      } catch (e) {
        setReminderResult({ success: false, error: e instanceof Error ? e.message : String(e) });
      } finally {
        setSendingReminder(false);
      }
    });
  };

  const ChevronIcon = expanded ? ChevronDown : ChevronRight;

  return (
    <div className={`border rounded-lg overflow-hidden transition-all ${selected ? 'ring-2 ring-primary' : 'border-border'}`}>
      {/* Header - Always visible */}
      <div className="flex items-center gap-2 p-3 bg-card hover:bg-muted/50 transition-colors">
        <div onClick={(e) => e.stopPropagation()}>
          <CheckboxInput
            checked={selected}
            onChange={onToggleSelect}
          />
        </div>
        
        <button
          onClick={onToggle}
          className="flex-1 flex items-center justify-between min-w-0"
        >
          <div className="flex-1 min-w-0 text-left">
            <p className="font-bold text-foreground truncate">{membership.Member.name}</p>
            <p className="text-xs text-muted-foreground">
              {isOverdue ? 'Expired' : 'Expires'}: {formatDate(membership.endDate)}
            </p>
          </div>
          
          <div className="flex items-center gap-2 ml-2">
            <Badge
              variant={isOverdue ? "destructive" : daysUntil === 0 ? "default" : "secondary"}
              className="font-bold"
            >
              {daysText}
            </Badge>
            <ChevronIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          </div>
        </button>
      </div>

      {/* Dropdown Content - Shows when expanded */}
      {expanded && (
        <div className="p-4 space-y-3 border-t bg-muted/20">
          {/* Member ID */}
          <div className="text-xs text-muted-foreground font-mono">
            ID: {membership.Member.id}
          </div>

          {/* Plan Badge */}
          <Badge variant="outline" className="w-full justify-center py-1.5 font-semibold">
            {membership.Plan.name}
          </Badge>

          {/* Amount */}
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-background border">
            <span className="text-xs text-muted-foreground font-medium">Amount</span>
            <span className="text-lg font-bold text-green-700 dark:text-green-400">
              {formatCurrency(membership.amount)}
            </span>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            {draftMessage && (
              <p className="text-xs p-2 rounded-md border bg-muted/50 whitespace-pre-wrap">
                {draftMessage}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                onClick={loadDraft}
                disabled={loadingDraft}
                variant="secondary"
                size="sm"
                className="flex-1 font-semibold"
              >
                {loadingDraft ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Preview draft"
                )}
              </Button>
              <Button
                onClick={sendReminder}
                disabled={sendingReminder || isQueued(`send-renewal-reminder:${membership.id}`)}
                variant="outline"
                size="sm"
                className="flex-1 font-semibold"
              >
                {sendingReminder || isQueued(`send-renewal-reminder:${membership.id}`) ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send
                  </>
                )}
              </Button>
            </div>

            {/* WhatsApp Actions */}
            <div className="grid grid-cols-3 gap-2">
              <WhatsAppButton membership={membership} type="bill" label="Bill" />
              <WhatsAppButton membership={membership} type="admission" label="Admission" />
              <WhatsAppButton membership={membership} type="plan" label="Plan" />
            </div>
          </div>

          {/* Reminder Result */}
          {reminderResult && (
            <div className={`text-xs p-2 rounded-lg border font-medium ${
              reminderResult.success 
                ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100" 
                : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100"
            }`}>
              {reminderResult.success ? `✓ ${reminderResult.message}` : `✗ ${reminderResult.error}`}
            </div>
          )}

          {/* View Member Link */}
          <Link
            href={`/dashboard/members/${membership.memberId}`}
            className="block text-center text-sm text-primary hover:underline font-medium py-2"
          >
            View Member Details →
          </Link>
        </div>
      )}
    </div>
  );
}

function WhatsAppButton({ membership, type, label }: { membership: Membership; type: "bill" | "admission" | "plan"; label?: string }) {
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const sendTemplate = async () => {
    setSending(true);
    setMsg(null);
    try {
      const phone = membership.Member?.phone?.replace(/\D/g, "") || "";
      const name = membership.Member?.name || "Member";
      const startDate = membership.startDate ?? membership.endDate;
      const validFrom = formatDate(startDate);
      const validTill = formatDate(membership.endDate);
      const memberId = membership.Member?.id || membership.memberId;
      const amount = Number(membership.amount) || 0;

      const templateType = type === "bill" ? "renewal" : type === "admission" ? "admission" : "workout";

      const payload: Record<string, unknown> = {
        phoneNumber: phone,
        templateType,
        data: { name, phoneNumber: phone },
      };

      if (templateType === "renewal") {
        payload.data = {
          name,
          amount,
          paymentMethod: "UPI",
          validFrom,
          validTill,
          phoneNumber: phone,
        };
      } else if (templateType === "admission") {
        payload.data = {
          name,
          memberId,
          program: `${membership.Plan.name}`,
          validFrom,
          validTill,
          phoneNumber: phone,
        };
      } else {
        payload.data = {
          name,
          validityPeriod: `${validFrom} - ${validTill}`,
          startDate: validFrom,
          phoneNumber: phone,
        };
      }

      const res = await fetch("/api/whatsapp/send-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (result.success) {
        setMsg({ ok: true, text: "Sent!" });
        setTimeout(() => setMsg(null), 2000);
      } else {
        setMsg({ ok: false, text: result.error || "Failed" });
      }
    } catch (e) {
      setMsg({ ok: false, text: "Error" });
    } finally {
      setSending(false);
    }
  };

  const icons = {
    bill: Receipt,
    admission: UserPlus,
    plan: Dumbbell,
  };

  const Icon = icons[type];

  return (
    <Button
      onClick={sendTemplate}
      disabled={sending}
      variant="outline"
      size="sm"
      className="flex-1"
      title={`Send ${type}`}
    >
      {sending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <Icon className="h-4 w-4 mr-1" />
          {label && <span className="text-xs">{label}</span>}
        </>
      )}
    </Button>
  );
}
