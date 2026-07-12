import { createOpenAI } from "@ai-sdk/openai";
import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";
import { resolveServerModel } from "@/lib/assistant/constants";
import type { AssistantContext, AssistantRequestBody } from "@/lib/assistant/types";
import {
  draftRenewalWhatsApp,
  listRecentPayments,
  listRenewalsDue,
  searchMembers,
  summarizeStats,
} from "@/lib/assistant/tools";

const SYSTEM = `You are Fitness360 AI, a read-only assistant for gym owners and staff.
Use tools to answer from the gym context provided with each request. Never claim you changed data.
Do not send WhatsApp or record payments yourself; you may draft message text for the admin to copy and send.
Be concise, use bullet lists for member lists, and use INR (₹) for money unless the user specifies otherwise.
If asked to perform a write action, explain what screen or workflow the user should use in the app.
When calling tools, use only the provided function names with valid JSON arguments — no XML or custom tags.`;

function buildTools(ctx: AssistantContext) {
  return {
    list_renewals_due: tool({
      description: "Members with Renewal Due or Expired status",
      inputSchema: z.object({ limit: z.number().int().min(1).max(30).optional() }),
      execute: async ({ limit }) => listRenewalsDue(ctx, limit ?? 15),
    }),
    search_members: tool({
      description: "Search members by name, email, or phone fragment",
      inputSchema: z.object({
        query: z.string().min(1).max(80),
        limit: z.number().int().min(1).max(20).optional(),
      }),
      execute: async ({ query, limit }) => searchMembers(ctx, query, limit ?? 10),
    }),
    summarize_dashboard: tool({
      description: "Key stats: members, check-ins, revenue, renewals, payments",
      inputSchema: z.object({
        includePaymentBreakdown: z
          .boolean()
          .optional()
          .describe("When true (default), include completed vs pending payment counts"),
      }),
      execute: async () => summarizeStats(ctx),
    }),
    list_recent_payments: tool({
      description: "Recent payment rows from context",
      inputSchema: z.object({ limit: z.number().int().min(1).max(20).optional() }),
      execute: async ({ limit }) => listRecentPayments(ctx, limit ?? 8),
    }),
    draft_renewal_whatsapp: tool({
      description: "Draft a short renewal WhatsApp message for a member by full name",
      inputSchema: z.object({ memberName: z.string().min(1).max(120) }),
      execute: async ({ memberName }) => draftRenewalWhatsApp(ctx, memberName),
    }),
  };
}

/** Groq returns this when the model emits a non-OpenAI tool-call shape (common on Llama). */
export function isGroqToolUseError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("Failed to call a function") ||
    msg.includes("tool_use_failed") ||
    msg.includes("tool call format")
  );
}

function buildContextSnapshot(ctx: AssistantContext): string {
  return JSON.stringify(
    {
      stats: summarizeStats(ctx),
      renewalsDue: listRenewalsDue(ctx, 12),
      recentPayments: listRecentPayments(ctx, 8),
      tasks: ctx.tasks ?? [],
      memberCount: ctx.members.length,
    },
    null,
    2,
  );
}

function mapHistory(body: AssistantRequestBody) {
  return (
    body.messages?.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })) ?? []
  );
}

async function runAssistantLlmWithContextOnly(
  groq: ReturnType<typeof createOpenAI>,
  body: AssistantRequestBody,
): Promise<{ text: string; mode: "llm" }> {
  const snapshot = buildContextSnapshot(body.context);
  const history = mapHistory(body);

  const result = await generateText({
    model: groq(resolveServerModel()),
    system: `${SYSTEM}\n\nGym data snapshot (authoritative for this reply):\n${snapshot}`,
    messages: [...history, { role: "user", content: body.message }],
  });

  const text = result.text?.trim();
  if (!text) {
    return {
      text: "I couldn't generate a reply. Try a shorter question.",
      mode: "llm",
    };
  }
  return { text, mode: "llm" };
}

export async function runAssistantLlm(
  apiKey: string,
  body: AssistantRequestBody,
): Promise<{ text: string; mode: "llm" }> {
  const groq = createOpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey,
  });

  const history = mapHistory(body);

  try {
    const result = await generateText({
      model: groq(resolveServerModel()),
      system: SYSTEM,
      messages: [...history, { role: "user", content: body.message }],
      tools: buildTools(body.context),
      stopWhen: stepCountIs(4),
    });

    const text = result.text?.trim();
    if (!text) {
      return runAssistantLlmWithContextOnly(groq, body);
    }
    return { text, mode: "llm" };
  } catch (err) {
    console.warn("[assistant] LLM tools path failed; retrying context-only", {
      toolUse: isGroqToolUseError(err),
    });
    return runAssistantLlmWithContextOnly(groq, body);
  }
}
