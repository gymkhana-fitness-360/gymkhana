/**
 * Protected admin phone → reserved externalId (e.g. MEM000). Source of truth: env, not repo.
 *
 * Set `PROTECTED_ADMIN_PHONE_MAP` to comma-separated pairs: `digits=memberId`
 * Example: PROTECTED_ADMIN_PHONE_MAP="9639627371=MEM000,8981503050=MEMXXX"
 *
 * Lookup normalizes numbers in getAdminMemberIdForPhone (member-protection.ts).
 */

let cached: Record<string, string> | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // re-read env at most every 5 minutes

export function getAdminPhoneToIdMap(): Record<string, string> {
  if (cached && Date.now() - cachedAt < CACHE_TTL_MS) return cached;
  const raw = process.env.PROTECTED_ADMIN_PHONE_MAP?.trim();
  const out: Record<string, string> = {};
  if (raw) {
    for (const part of raw.split(",")) {
      const seg = part.trim();
      if (!seg) continue;
      const eq = seg.indexOf("=");
      if (eq === -1) continue;
      const digits = seg.slice(0, eq).replace(/\D/g, "");
      const memberId = seg.slice(eq + 1).trim();
      if (digits && memberId) out[digits] = memberId;
    }
  }
  cached = out;
  cachedAt = Date.now();
  return out;
}

/** For tests that mutate process.env.PROTECTED_ADMIN_PHONE_MAP */
export function resetAdminPhoneMapCache(): void {
  cached = null;
  cachedAt = 0;
}
