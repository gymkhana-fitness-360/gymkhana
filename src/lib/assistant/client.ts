import {
  FITNESS360_AI_KEY_HEADER,
  FITNESS360_AI_KEY_HEADER_LEGACY,
  FITNESS360_AI_KEY_STORAGE,
  FITNESS360_AI_KEY_STORAGE_LEGACY,
  FITNESS360_AI_API_PATH,
} from "@/lib/assistant/constants";
import type {
  AssistantChatResponse,
  AssistantContext,
  AssistantRequestBody,
} from "@/lib/assistant/types";

export type AssistantClientConfig = {
  /** Base URL without path, e.g. `https://app.fitness360.com` or empty for same-origin. */
  baseUrl?: string;
  apiPath?: string;
  getApiKey?: () => string | null;
};

export type AssistantMessage = {
  role: "user" | "assistant";
  content: string;
};

function readBrowserApiKey(): string {
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

export function saveBrowserApiKey(value: string): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = value.trim();
    if (trimmed) {
      localStorage.setItem(FITNESS360_AI_KEY_STORAGE, trimmed);
      localStorage.removeItem(FITNESS360_AI_KEY_STORAGE_LEGACY);
    } else {
      localStorage.removeItem(FITNESS360_AI_KEY_STORAGE);
      localStorage.removeItem(FITNESS360_AI_KEY_STORAGE_LEGACY);
    }
  } catch {
    /* ignore */
  }
}

export type AssistantConfig = {
  serverKeyConfigured: boolean;
  model: string;
};

export async function fetchAssistantConfig(
  config: Pick<AssistantClientConfig, "baseUrl" | "apiPath"> = {},
): Promise<AssistantConfig> {
  const base = config.baseUrl?.replace(/\/$/, "") ?? "";
  const path = (config.apiPath ?? FITNESS360_AI_API_PATH).replace(/\/$/, "");
  const res = await fetch(`${base}${path}/config`);
  if (!res.ok) {
    return { serverKeyConfigured: false, model: "" };
  }
  return (await res.json()) as AssistantConfig;
}

export async function sendAssistantMessage(
  params: {
    message: string;
    context: AssistantContext;
    messages?: AssistantMessage[];
  },
  config: AssistantClientConfig = {},
): Promise<AssistantChatResponse> {
  const base = config.baseUrl?.replace(/\/$/, "") ?? "";
  const path = config.apiPath ?? FITNESS360_AI_API_PATH;
  const apiKey = config.getApiKey?.() ?? readBrowserApiKey();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey?.trim()) {
    headers[FITNESS360_AI_KEY_HEADER] = apiKey.trim();
    headers[FITNESS360_AI_KEY_HEADER_LEGACY] = apiKey.trim();
  }

  const body: AssistantRequestBody = {
    message: params.message,
    messages: params.messages,
    context: params.context,
  };

  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  return (await res.json()) as AssistantChatResponse;
}
