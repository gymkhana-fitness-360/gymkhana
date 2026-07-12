/** Portable Fitness360 AI service — host-agnostic constants. */

export const FITNESS360_AI_API_PATH = "/api/assistant";

/** Request header for BYOK (desktop / web / playground). */
export const FITNESS360_AI_KEY_HEADER = "x-fitness360-ai-key";

/** @deprecated Accept legacy playground header during migration. */
export const FITNESS360_AI_KEY_HEADER_LEGACY = "x-playground-ai-key";

export const FITNESS360_AI_KEY_STORAGE = "fitness360_assistant_ai_key";

/** @deprecated Legacy localStorage key. */
export const FITNESS360_AI_KEY_STORAGE_LEGACY = "fitness360_playground_ai_key";

/** Groq model with reliable OpenAI-style tool calling (see console.groq.com/docs/tool-use). */
export const FITNESS360_AI_DEFAULT_MODEL = "qwen/qwen3-32b";

export function resolveServerApiKey(): string | undefined {
  return process.env.FITNESS360_AI_API_KEY?.trim() || undefined;
}

export function resolveServerModel(): string {
  return process.env.FITNESS360_AI_MODEL?.trim() || FITNESS360_AI_DEFAULT_MODEL;
}
