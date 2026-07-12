/**
 * Rate limiting — in-memory store with periodic cleanup.
 *
 * LIMITATION (Vercel / serverless): Each lambda instance has its own Map. Limits are not shared
 * across instances, so this is best-effort throttling only — not strong abuse protection against
 * distributed traffic. For real limits, use a shared store (e.g. @upstash/ratelimit + Redis).
 *
 * Key: x-forwarded-for or x-real-ip + path.
 * Tiers: lenient (GET), moderate (writes), strict (sensitive writes),
 * whatsappSend / whatsappBulk (expensive outbound), whatsappSession (browser spin-up).
 */

import { NextResponse } from "next/server";

export type Tier =
  | "strict"
  | "moderate"
  | "lenient"
  | "whatsappSend"
  | "whatsappBulk"
  | "whatsappSession"
  /** Fitness360 AI — shared server Groq key. */
  | "assistantShared"
  /** Fitness360 AI — caller BYOK (higher cap; they pay the provider). */
  | "assistantByok"
  /** Renewals Recompute — each hit can trigger many LLM calls. */
  | "inferenceRefresh"
  /** Hosted /api/mcp — agent tool calls. */
  | "mcpHosted"
  /** @deprecated Use assistantShared */
  | "playgroundCopilotDemo"
  /** @deprecated Use assistantByok */
  | "playgroundCopilotByok";

const LIMITS: Record<Tier, { windowMs: number; maxRequests: number }> = {
  strict: { windowMs: 60_000, maxRequests: 10 },
  moderate: { windowMs: 60_000, maxRequests: 30 },
  lenient: { windowMs: 60_000, maxRequests: 100 },
  assistantShared: { windowMs: 60_000, maxRequests: 4 },
  assistantByok: { windowMs: 60_000, maxRequests: 12 },
  inferenceRefresh: { windowMs: 600_000, maxRequests: 3 },
  mcpHosted: { windowMs: 60_000, maxRequests: 60 },
  playgroundCopilotDemo: { windowMs: 60_000, maxRequests: 4 },
  playgroundCopilotByok: { windowMs: 60_000, maxRequests: 12 },
  /** Single-recipient WhatsApp sends (still best-effort per serverless instance). */
  whatsappSend: { windowMs: 60_000, maxRequests: 6 },
  /** Bulk sends — lower cap to reduce blast radius. */
  whatsappBulk: { windowMs: 60_000, maxRequests: 2 },
  /** Session/browser initialization — few per window. */
  whatsappSession: { windowMs: 600_000, maxRequests: 5 },
};

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes to prevent memory leak
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupStore(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  
  lastCleanup = now;
  for (const [key, entry] of store.entries()) {
    if (now >= entry.resetAt) {
      store.delete(key);
    }
  }
}

function getKey(identifier: string, path: string, tier: Tier): string {
  return `${tier}:${identifier}:${path}`;
}

export function rateLimit(
  identifier: string,
  path: string,
  tier: Tier = "moderate"
): { ok: boolean; remaining: number; resetIn: number } {
  cleanupStore();
  
  const { windowMs, maxRequests } = LIMITS[tier];
  const key = getKey(identifier, path, tier);
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: maxRequests - 1, resetIn: Math.ceil(windowMs / 1000) };
  }

  entry.count++;
  const remaining = Math.max(0, maxRequests - entry.count);
  const ok = entry.count <= maxRequests;

  return {
    ok,
    remaining,
    resetIn: Math.max(0, Math.ceil((entry.resetAt - now) / 1000)),
  };
}

export function getIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0]?.trim() ?? realIp ?? "unknown";
  return ip;
}

export function getPath(request: Request): string {
  try {
    const url = new URL(request.url);
    return url.pathname;
  } catch {
    return "/";
  }
}

/**
 * Apply rate limit to request. Returns 429 NextResponse if exceeded, or null to proceed.
 */
export function withRateLimit(
  request: Request,
  tier: Tier = "moderate"
): NextResponse | null {
  const id = getIdentifier(request);
  const path = getPath(request);
  const { ok, remaining, resetIn } = rateLimit(id, path, tier);
  
  if (!ok) {
    return NextResponse.json(
      {
        success: false,
        error: "Too many requests",
        code: "RATE_LIMITED",
        retryAfter: resetIn,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(resetIn),
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset": String(Math.ceil(Date.now() / 1000) + resetIn),
        },
      }
    );
  }
  return null;
}
