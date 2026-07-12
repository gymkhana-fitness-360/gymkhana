import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { resolveServerApiKey } from "@/lib/assistant/constants";

export type InferenceProviderId = "groq" | "anthropic" | "dev-mock";

/** Groq models that support AI SDK `generateObject` (json_schema). See console.groq.com/docs/structured-outputs */
export const GROQ_STRUCTURED_OUTPUT_MODEL =
  "openai/gpt-oss-20b";

/** Model for readiness `generateObject` — separate from Fitness360 AI chat model. */
export function resolveInferenceModel(): string {
  const explicit = process.env.FITNESS360_INFERENCE_MODEL?.trim();
  if (explicit) return explicit;

  return GROQ_STRUCTURED_OUTPUT_MODEL;
}

function resolveProviderId(): InferenceProviderId {
  if (isDevMockInferenceEnabled()) return "dev-mock";

  const raw = process.env.FITNESS360_AI_PROVIDER?.trim().toLowerCase();
  if (raw === "anthropic") return "anthropic";
  if (raw === "groq") return "groq";
  if (process.env.ANTHROPIC_API_KEY?.trim()) return "anthropic";
  return "groq";
}

export function resolveAnthropicApiKey(): string | undefined {
  return process.env.ANTHROPIC_API_KEY?.trim();
}

/** Dev-only structured assessment without external API (honest labeling in UI). */
export function isDevMockInferenceEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.FITNESS360_INFERENCE_DEV_MOCK === "false") return false;
  if (resolveServerApiKey() || resolveAnthropicApiKey()) return false;
  return (
    process.env.FITNESS360_INFERENCE_DEV_MOCK === "true" ||
    process.env.NODE_ENV === "development"
  );
}

export function isInferenceEnabled(): boolean {
  if (process.env.FITNESS360_INFERENCE_ENABLED === "false") return false;
  return Boolean(
    resolveServerApiKey() ||
      resolveAnthropicApiKey() ||
      isDevMockInferenceEnabled(),
  );
}

/** Max `generateObject` calls per gym per Recompute/cron (0 = rules-only batch). Hard cap 30. */
export function resolveMaxLlmMembersPerRun(): number {
  const raw = process.env.FITNESS360_INFERENCE_MAX_MEMBERS_PER_RUN?.trim();
  const n = raw ? parseInt(raw, 10) : 30;
  if (Number.isNaN(n)) return 30;
  return Math.min(30, Math.max(0, n));
}

export function isCohortBriefInferenceEnabled(): boolean {
  return process.env.FITNESS360_INFERENCE_COHORT_BRIEF !== "false";
}

/**
 * Nightly Inngest job LLM batch.
 * Default: off in production (demo-safe). Set `FITNESS360_INFERENCE_CRON_LLM=true` to enable.
 */
export function isCronLlmInferenceEnabled(): boolean {
  const raw = process.env.FITNESS360_INFERENCE_CRON_LLM?.trim().toLowerCase();
  if (raw === "true") return true;
  if (raw === "false") return false;
  return process.env.NODE_ENV !== "production";
}

export function getInferenceConfig(): {
  enabled: boolean;
  provider: InferenceProviderId | null;
  model: string | null;
  hint: string | null;
  isDevMock: boolean;
} {
  if (isDevMockInferenceEnabled()) {
    return {
      enabled: true,
      provider: "dev-mock",
      model: "dev-mock-readiness-v1",
      hint: "Dev mock active (no API key). Set FITNESS360_AI_API_KEY or ANTHROPIC_API_KEY for live LLM.",
      isDevMock: true,
    };
  }

  const provider = resolveProviderId();
  const hasGroq = Boolean(resolveServerApiKey());
  const hasAnthropic = Boolean(resolveAnthropicApiKey());

  if (provider === "anthropic" && !hasAnthropic) {
    return {
      enabled: false,
      provider: null,
      model: null,
      hint: "Set ANTHROPIC_API_KEY or FITNESS360_AI_PROVIDER=groq with FITNESS360_AI_API_KEY.",
      isDevMock: false,
    };
  }
  if (provider === "groq" && !hasGroq) {
    return {
      enabled: false,
      provider: null,
      model: null,
      hint: "Set FITNESS360_AI_API_KEY in .env.local and restart dev.",
      isDevMock: false,
    };
  }

  const model =
    provider === "anthropic"
      ? process.env.ANTHROPIC_MODEL?.trim() || "claude-3-5-haiku-latest"
      : resolveInferenceModel();

  return { enabled: true, provider, model, hint: null, isDevMock: false };
}

export function getInferenceModel() {
  const config = getInferenceConfig();
  if (config.isDevMock) {
    throw new Error("Dev mock mode — do not call getInferenceModel()");
  }
  if (!config.enabled || !config.provider) {
    throw new Error(config.hint ?? "AI inference is not configured");
  }

  if (config.provider === "anthropic") {
    const anthropic = createAnthropic({
      apiKey: resolveAnthropicApiKey(),
    });
    return anthropic(config.model!);
  }

  const groq = createOpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: resolveServerApiKey(),
  });
  return groq(config.model!);
}
