import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { Tier } from "./rate-limit";

const TIER_TO_LIMIT: Record<Tier, { requests: number; window: `${number} s` | `${number} m` }> = {
  strict: { requests: 10, window: "60 s" },
  moderate: { requests: 30, window: "60 s" },
  lenient: { requests: 100, window: "60 s" },
  whatsappSend: { requests: 6, window: "60 s" },
  whatsappBulk: { requests: 2, window: "60 s" },
  whatsappSession: { requests: 5, window: "600 s" },
  assistantShared: { requests: 4, window: "60 s" },
  assistantByok: { requests: 12, window: "60 s" },
  inferenceRefresh: { requests: 3, window: "600 s" },
  mcpHosted: { requests: 60, window: "60 s" },
  playgroundCopilotDemo: { requests: 4, window: "60 s" },
  playgroundCopilotByok: { requests: 12, window: "60 s" },
};

const limiters = new Map<Tier, Ratelimit>();

function getLimiter(tier: Tier): Ratelimit {
  let limiter = limiters.get(tier);
  if (!limiter) {
    const cfg = TIER_TO_LIMIT[tier];
    limiter = new Ratelimit({
      redis: new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      }),
      limiter: Ratelimit.slidingWindow(cfg.requests, cfg.window),
      prefix: `fitness360:${tier}`,
    });
    limiters.set(tier, limiter);
  }
  return limiter;
}

export async function distributedRateLimit(
  identifier: string,
  path: string,
  tier: Tier
): Promise<{ ok: boolean; remaining: number; resetIn: number }> {
  const key = `${identifier}:${path}`;
  const result = await getLimiter(tier).limit(key);
  return {
    ok: result.success,
    remaining: result.remaining,
    resetIn: Math.max(0, Math.ceil((result.reset - Date.now()) / 1000)),
  };
}
