import { createHmac, timingSafeEqual } from "crypto";

const SECRET =
  process.env.NEXTAUTH_SECRET ?? process.env.MEMBER_SESSION_SECRET ?? "dev-member-session";

export function signMemberSession(memberId: string, gymId: string): string {
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const payload = `${memberId}:${gymId}:${exp}`;
  const sig = createHmac("sha256", SECRET).update(payload).digest("hex");
  return `${payload}:${sig}`;
}

export function verifyMemberSession(
  token: string,
): { memberId: string; gymId: string } | null {
  const parts = token.split(":");
  if (parts.length !== 4) return null;
  const [memberId, gymId, expStr, sig] = parts;
  const payload = `${memberId}:${gymId}:${expStr}`;
  const expected = createHmac("sha256", SECRET).update(payload).digest("hex");
  try {
    if (
      !timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) ||
      Number(expStr) < Date.now()
    ) {
      return null;
    }
  } catch {
    return null;
  }
  return { memberId, gymId };
}
