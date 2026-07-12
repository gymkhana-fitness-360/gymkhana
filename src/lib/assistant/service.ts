import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  FITNESS360_AI_KEY_HEADER,
  FITNESS360_AI_KEY_HEADER_LEGACY,
  resolveServerApiKey,
} from "@/lib/assistant/constants";
import { ruleBasedAssistantReply } from "@/lib/assistant/fallback";
import { runAssistantLlm } from "@/lib/assistant/llm";
import { assistantRequestSchema, type AssistantChatResponse } from "@/lib/assistant/types";
import {
  getIdentifier,
  withRateLimit,
  type Tier,
} from "@/lib/middleware/rate-limit";

export function resolveAssistantApiKey(request: Request): {
  key: string | null;
  source: "byok" | "server" | "none";
} {
  const fromHeader =
    request.headers.get(FITNESS360_AI_KEY_HEADER)?.trim() ||
    request.headers.get(FITNESS360_AI_KEY_HEADER_LEGACY)?.trim();
  if (fromHeader && fromHeader.length >= 20 && fromHeader.length <= 256) {
    return { key: fromHeader, source: "byok" };
  }
  const serverKey = resolveServerApiKey();
  if (serverKey) {
    return { key: serverKey, source: "server" };
  }
  return { key: null, source: "none" };
}

function rateLimitTier(source: "byok" | "server" | "none"): Tier {
  return source === "byok" ? "assistantByok" : "assistantShared";
}

/** Host-agnostic Fitness360 AI chat handler — mount at `/api/assistant` or proxy from desktop. */
export async function handleAssistantChat(request: Request): Promise<NextResponse> {
  let { key: apiKey, source } = resolveAssistantApiKey(request);

  // Never spend the server's API key for anonymous callers — that would let anyone
  // on the internet use this as a free LLM proxy. Anonymous + server-key → rule-based
  // fallback. BYOK (caller's own key) and signed-in users keep full LLM access.
  if (source === "server") {
    const session = await auth();
    if (!session?.user) {
      apiKey = null;
      source = "none";
    }
  }

  const limited = withRateLimit(request, rateLimitTier(source));
  if (limited) return limited;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" } satisfies AssistantChatResponse,
      { status: 400 },
    );
  }

  const parsed = assistantRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid request",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const body = parsed.data;
  const ip = getIdentifier(request);

  try {
    if (!apiKey) {
      const fallback = ruleBasedAssistantReply(body.message, body.context, {
        reason: "no_key",
      });
      return NextResponse.json({
        success: true,
        reply: fallback.text,
        mode: fallback.mode,
        keySource: "none",
        hint: "Configure FITNESS360_AI_API_KEY on the server or add your Groq key in Fitness360 AI settings.",
      } satisfies AssistantChatResponse);
    }

    const result = await runAssistantLlm(apiKey, body);
    return NextResponse.json({
      success: true,
      reply: result.text,
      mode: result.mode,
      keySource: source,
    } satisfies AssistantChatResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fitness360 AI request failed";
    const safe = message.replace(/gsk_[a-zA-Z0-9]+/g, "[redacted]");
    console.error("[assistant]", { ip, source, error: safe });

    const fallback = ruleBasedAssistantReply(body.message, body.context, {
      reason: "provider_error",
    });
    return NextResponse.json({
      success: true,
      reply: fallback.text,
      mode: fallback.mode,
      keySource: source,
      hint:
        source === "byok"
          ? "Groq returned an error — showing quick answers. Check your key at console.groq.com or try FITNESS360_AI_MODEL=qwen/qwen3-32b."
          : "AI provider error — showing quick answers. Check FITNESS360_AI_API_KEY and FITNESS360_AI_MODEL on the server.",
    } satisfies AssistantChatResponse);
  }
}
