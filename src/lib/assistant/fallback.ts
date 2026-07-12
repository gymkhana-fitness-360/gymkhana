import type { AssistantContext } from "@/lib/assistant/types";
import {
  draftRenewalWhatsApp,
  listRecentPayments,
  listRenewalsDue,
  listTasks,
  searchMembers,
  summarizeStats,
} from "@/lib/assistant/tools";

export type RuleBasedReplyReason = "no_key" | "no_match" | "provider_error";

export type RuleBasedReplyOptions = {
  reason?: RuleBasedReplyReason;
};

/** Deterministic replies when the LLM is unavailable or as a last resort. */
export function ruleBasedAssistantReply(
  message: string,
  ctx: AssistantContext,
  options: RuleBasedReplyOptions = {},
): { text: string; mode: "rules" } {
  const reason = options.reason ?? "no_match";
  const lower = message.toLowerCase();

  if (
    lower.includes("renewal") ||
    lower.includes("due") ||
    lower.includes("expir")
  ) {
    const rows = listRenewalsDue(ctx);
    if (rows.length === 0) {
      return {
        text: "No members are marked Renewal Due or Expired in your current data.",
        mode: "rules",
      };
    }
    const lines = rows.map(
      (r) => `• **${r.name}** — ${r.plan}, ${r.status} (expires ${r.expiry})`,
    );
    return {
      text: `**${rows.length} member(s) need attention:**\n\n${lines.join("\n")}\n\n_Send reminders from the dashboard when WhatsApp Business API is configured._`,
      mode: "rules",
    };
  }

  if (lower.includes("task") || lower.includes("todo") || lower.includes("pending")) {
    const rows = listTasks(ctx);
    if (rows.length === 0) {
      return { text: "No open tasks in the current gym snapshot.", mode: "rules" };
    }
    const lines = rows.map(
      (t) => `• ${t.done ? "~~" : ""}**${t.task}**${t.done ? "~~" : ""} (${t.priority})`,
    );
    return {
      text: `**Tasks (${rows.filter((t) => !t.done).length} open):**\n\n${lines.join("\n")}`,
      mode: "rules",
    };
  }

  if (lower.includes("summar") || lower.includes("stats") || lower.includes("revenue")) {
    const s = summarizeStats(ctx);
    return {
      text: [
        "**Gym snapshot**",
        `• Active members: **${s.activeMembers}**`,
        `• Check-ins today: **${s.todayCheckins}**`,
        `• Monthly revenue: **₹${s.monthlyRevenue.toLocaleString("en-IN")}**`,
        `• Renewals due: **${s.renewalsDue}**`,
        `• Pending payments: **${s.pendingPayments}**`,
        `• Completed payments in view: **${s.paymentsInContext.completed}** (₹${s.paymentsInContext.completedRevenue.toLocaleString("en-IN")})`,
      ].join("\n"),
      mode: "rules",
    };
  }

  if (lower.includes("payment") || lower.includes("recent")) {
    const rows = listRecentPayments(ctx);
    const lines = rows.map(
      (p) => `• ${p.member} — ₹${p.amount.toLocaleString("en-IN")} (${p.type}, ${p.status})`,
    );
    return {
      text: `**Recent payments:**\n\n${lines.join("\n")}`,
      mode: "rules",
    };
  }

  const findMatch = message.match(/(?:find|search|who is)\s+(.+)/i);
  if (findMatch) {
    const hits = searchMembers(ctx, findMatch[1]);
    if (hits.length === 0) {
      return { text: `No members matched "${findMatch[1]}".`, mode: "rules" };
    }
    const lines = hits.map(
      (m) => `• **${m.name}** — ${m.plan}, ${m.status}`,
    );
    return { text: lines.join("\n"), mode: "rules" };
  }

  if (lower.includes("whatsapp") || lower.includes("draft") || lower.includes("remind")) {
    const nameGuess =
      ctx.members.find((m) => lower.includes(m.name.split(" ")[0].toLowerCase()))
        ?.name ?? "Sarah Mitchell";
    const draft = draftRenewalWhatsApp(ctx, nameGuess);
    if ("error" in draft) {
      return { text: draft.error, mode: "rules" };
    }
    return {
      text: `**Draft for ${draft.member}** (copy only — confirm before sending):\n\n> ${draft.draft}`,
      mode: "rules",
    };
  }

  if (reason === "no_key") {
    return {
      text: [
        "I'm in **quick-answer mode** (no Groq key on the server or in this browser). Try:",
        "• *Who is due for renewal?*",
        "• *Summarize revenue and check-ins*",
        "• *Pending tasks*",
        "• *Find Sarah*",
        "",
        "Set **`FITNESS360_AI_API_KEY`** in `.env.local` and restart `npm run dev`, or add a personal key below.",
      ].join("\n"),
      mode: "rules",
    };
  }

  if (reason === "provider_error") {
    return {
      text: [
        "Groq couldn't answer that just now, and I couldn't match it to a quick template.",
        "",
        "Try one of these, or ask again in a moment:",
        "• *Who is due for renewal?*",
        "• *Summarize revenue and check-ins*",
        "• *Pending tasks*",
        "• *List recent payments*",
      ].join("\n"),
      mode: "rules",
    };
  }

  return {
    text: [
      "I couldn't match that to gym data in **quick-answer mode**. Try:",
      "• *Who is due for renewal?*",
      "• *Summarize revenue and check-ins*",
      "• *Pending tasks*",
      "• *List recent payments*",
    ].join("\n"),
    mode: "rules",
  };
}
