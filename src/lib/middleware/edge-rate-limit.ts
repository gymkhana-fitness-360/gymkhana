/**
 * Distributed rate limiting (GYM-M2-006).
 * Uses Upstash when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set;
 * otherwise falls back to in-memory limits in rate-limit.ts.
 */
import type { Tier } from "./rate-limit";
import { rateLimit } from "./rate-limit";

type LimitResult = { ok: boolean; remaining: number; resetIn: number };

let upstashModule: typeof import("./edge-rate-limit-upstash") | null | undefined;

async function loadUpstash(): Promise<typeof import("./edge-rate-limit-upstash") | null> {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  if (upstashModule === undefined) {
    try {
      upstashModule = await import("./edge-rate-limit-upstash");
    } catch {
      upstashModule = null;
    }
  }
  return upstashModule;
}

export async function edgeRateLimit(
  identifier: string,
  path: string,
  tier: Tier = "moderate"
): Promise<LimitResult> {
  const upstash = await loadUpstash();
  if (upstash) {
    return upstash.distributedRateLimit(identifier, path, tier);
  }
  return rateLimit(identifier, path, tier);
}
