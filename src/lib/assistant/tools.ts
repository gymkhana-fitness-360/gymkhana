import type { AssistantContext } from "@/lib/assistant/types";

export function listRenewalsDue(ctx: AssistantContext, limit = 15) {
  const rows = ctx.members.filter(
    (m) => m.status === "Renewal Due" || m.status === "Expired",
  );
  return rows.slice(0, limit).map((m) => ({
    name: m.name,
    plan: m.plan,
    status: m.status,
    expiry: m.expiry ?? "—",
    phone: m.phone ?? "—",
  }));
}

export function searchMembers(ctx: AssistantContext, query: string, limit = 10) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return ctx.members
    .filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.email?.toLowerCase().includes(q) ?? false) ||
        (m.phone?.includes(q) ?? false),
    )
    .slice(0, limit)
    .map((m) => ({
      name: m.name,
      plan: m.plan,
      status: m.status,
      expiry: m.expiry ?? "—",
    }));
}

export function summarizeStats(ctx: AssistantContext) {
  const completed = ctx.payments.filter((p) => p.status === "Completed");
  const pending = ctx.payments.filter((p) => p.status === "Pending");
  const failed = ctx.payments.filter((p) => p.status === "Failed");
  const revenueFromList = completed.reduce((s, p) => s + p.amount, 0);

  return {
    activeMembers: ctx.stats.activeMembers,
    todayCheckins: ctx.stats.todayCheckins,
    monthlyRevenue: ctx.stats.monthlyRevenue,
    renewalsDue: ctx.stats.renewalsDue,
    pendingPayments: ctx.stats.pendingPayments,
    paymentsInContext: {
      completed: completed.length,
      pending: pending.length,
      failed: failed.length,
      completedRevenue: revenueFromList,
    },
  };
}

export function listRecentPayments(ctx: AssistantContext, limit = 8) {
  return ctx.payments.slice(0, limit).map((p) => ({
    member: p.member,
    amount: p.amount,
    type: p.type,
    status: p.status,
    date: p.date,
  }));
}

export function listTasks(ctx: AssistantContext) {
  return (ctx.tasks ?? []).map((t) => ({
    task: t.task,
    priority: t.priority ?? "medium",
    done: t.done ?? false,
  }));
}

export function draftRenewalWhatsApp(
  ctx: AssistantContext,
  memberName: string,
): { member: string; draft: string } | { error: string } {
  const member = ctx.members.find(
    (m) => m.name.toLowerCase() === memberName.trim().toLowerCase(),
  );
  if (!member) {
    const partial = searchMembers(ctx, memberName, 1)[0];
    if (!partial) {
      return { error: `No member found matching "${memberName}".` };
    }
    return {
      member: partial.name,
      draft: `Hi ${partial.name.split(" ")[0]}, your ${partial.plan} membership is due for renewal (${partial.status}). Reply here or visit the front desk — we'd love to keep you training!`,
    };
  }
  return {
    member: member.name,
    draft: `Hi ${member.name.split(" ")[0]}, your ${member.plan} plan (${member.status}) expires ${member.expiry ?? "soon"}. Renew today to avoid interruption — reply YES and we'll help you at the desk.`,
  };
}
