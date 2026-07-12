"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FITNESS360_AI_KEY_STORAGE,
  FITNESS360_AI_KEY_STORAGE_LEGACY,
} from "@/lib/assistant/constants";
import {
  fetchAssistantConfig,
  saveBrowserApiKey,
  sendAssistantMessage,
  type AssistantClientConfig,
  type AssistantConfig,
  type AssistantMessage,
} from "@/lib/assistant/client";
import type { AssistantContext } from "@/lib/assistant/types";
import { Bot, Check, KeyRound, Loader2, Send, Sparkles } from "lucide-react";

const DEFAULT_PROMPTS = [
  "Who is due for renewal?",
  "Summarize revenue and today's check-ins",
  "Pending tasks",
  "Find Sarah Mitchell",
  "List recent payments",
  "Draft a renewal WhatsApp for Sarah Mitchell",
] as const;

type ChatRow = AssistantMessage & {
  id: string;
  mode?: string;
  keySource?: "byok" | "server" | "none";
  hint?: string;
};

function modeLabel(row: ChatRow): string | null {
  if (!row.mode || row.role !== "assistant" || row.mode === "system") return null;
  if (row.mode === "rules") return "Quick answers";
  if (row.keySource === "server") return "Groq · server key";
  if (row.keySource === "byok") return "Groq · your key";
  if (row.mode === "llm") return "Groq";
  return row.mode;
}

function readStoredKey(): string {
  if (typeof window === "undefined") return "";
  try {
    return (
      localStorage.getItem(FITNESS360_AI_KEY_STORAGE) ??
      localStorage.getItem(FITNESS360_AI_KEY_STORAGE_LEGACY) ??
      ""
    );
  } catch {
    return "";
  }
}

export type AssistantChatProps = {
  context: AssistantContext;
  client?: AssistantClientConfig;
  welcomeMessage?: string;
  quickPrompts?: readonly string[];
  subtitle?: string;
};

export function AssistantChat({
  context,
  client,
  welcomeMessage = "Hi — I'm Fitness360 AI. Ask about renewals, revenue, members, or draft a WhatsApp. I won't send messages or record payments without your confirmation.",
  quickPrompts = DEFAULT_PROMPTS,
  subtitle,
}: AssistantChatProps) {
  const [serverConfig, setServerConfig] = useState<AssistantConfig | null>(null);
  const [messages, setMessages] = useState<ChatRow[]>([
    { id: "welcome", role: "assistant", content: welcomeMessage, mode: "system" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userKey, setUserKey] = useState(readStoredKey);
  const [keyDraft, setKeyDraft] = useState(readStoredKey);
  const [keySaved, setKeySaved] = useState(false);
  const [showKeyPanel, setShowKeyPanel] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void fetchAssistantConfig(client).then(setServerConfig);
  }, [client]);

  const resolvedSubtitle =
    subtitle ??
    (serverConfig?.serverKeyConfigured
      ? userKey.trim()
        ? "Server Groq key is active; your personal key overrides it for this browser."
        : `Using server Groq key (${serverConfig.model}). Personal key optional below.`
      : "No server key detected — add FITNESS360_AI_API_KEY to .env.local or a personal Groq key.");

  const saveApiKey = useCallback(() => {
    const trimmed = keyDraft.trim();
    setUserKey(trimmed);
    saveBrowserApiKey(trimmed);
    setKeySaved(true);
    window.setTimeout(() => setKeySaved(false), 2500);
  }, [keyDraft]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }, []);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setError(null);
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", content: trimmed },
    ]);
    setInput("");
    setLoading(true);
    scrollToBottom();

    const history = messages
      .filter((m) => m.id !== "welcome")
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const data = await sendAssistantMessage(
        { message: trimmed, context, messages: history },
        { ...client, getApiKey: () => userKey.trim() || null },
      );

      if (!data.success) {
        setError(data.error ?? "Request failed");
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: data.reply ?? "",
          mode: data.mode,
          keySource: data.keySource,
          hint: data.hint,
        },
      ]);
      scrollToBottom();
    } catch {
      setError("Network error — try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-400" />
            Fitness360 AI
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{resolvedSubtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          {serverConfig?.serverKeyConfigured && !userKey.trim() && (
            <Badge variant="secondary" className="text-xs">
              Server key
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            Read-only
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {quickPrompts.map((prompt) => (
          <Button
            key={prompt}
            type="button"
            variant="outline"
            size="sm"
            className="text-xs h-8"
            disabled={loading}
            onClick={() => void send(prompt)}
          >
            {prompt}
          </Button>
        ))}
      </div>

      <Card className="border-border/80">
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Chat
            </CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => {
                if (showKeyPanel) setShowKeyPanel(false);
                else {
                  setKeyDraft(userKey);
                  setShowKeyPanel(true);
                }
              }}
            >
              <KeyRound className="h-3.5 w-3.5 mr-1" />
              {userKey.trim()
                ? "Your API key"
                : serverConfig?.serverKeyConfigured
                  ? "Personal key (optional)"
                  : "Add API key"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0 space-y-3">
          {showKeyPanel && (
            <form
              className="rounded-lg border border-border bg-muted/30 p-3 space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                saveApiKey();
              }}
            >
              <Label htmlFor="assistant-groq-key" className="text-xs">
                Personal Groq key (optional — overrides server key on this device)
              </Label>
              <div className="flex gap-2">
                <Input
                  id="assistant-groq-key"
                  type="password"
                  autoComplete="off"
                  placeholder="gsk_…"
                  value={keyDraft}
                  onChange={(e) => setKeyDraft(e.target.value)}
                  className="font-mono text-sm flex-1"
                />
                <Button type="submit" size="sm" className="shrink-0">
                  Save
                </Button>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  Free tier at{" "}
                  <a
                    href="https://console.groq.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-400 hover:underline"
                  >
                    console.groq.com
                  </a>
                  . Press Enter or Save.
                </p>
                {keySaved && (
                  <span className="text-xs text-green-500 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Key saved
                  </span>
                )}
              </div>
              {userKey && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 text-muted-foreground"
                  onClick={() => {
                    setKeyDraft("");
                    setUserKey("");
                    saveBrowserApiKey("");
                  }}
                >
                  Remove saved key
                </Button>
              )}
            </form>
          )}

          <div
            ref={scrollRef}
            className="h-[min(420px,50vh)] overflow-y-auto rounded-lg border border-border bg-background/50 p-3 space-y-3"
          >
            {messages.map((m) => (
              <div
                key={m.id}
                className={m.role === "user" ? "ml-8 text-right" : "mr-8 text-left"}
              >
                <div
                  className={
                    m.role === "user"
                      ? "inline-block rounded-lg bg-orange-500/15 border border-orange-500/20 px-3 py-2 text-sm text-left max-w-full"
                      : "inline-block rounded-lg bg-muted px-3 py-2 text-sm max-w-full whitespace-pre-wrap"
                  }
                >
                  {m.content}
                </div>
                {modeLabel(m) && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {modeLabel(m)}
                  </p>
                )}
                {m.hint && (
                  <p className="text-[10px] text-amber-600/90 dark:text-amber-400/90 mt-0.5">
                    {m.hint}
                  </p>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Thinking…
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about renewals, payments, or draft a message…"
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
