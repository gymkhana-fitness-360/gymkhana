import crypto from "node:crypto";
import { readEnvVar } from "@/lib/prisma-env";

function paySecret(): string {
  return readEnvVar("QR_SECRET") ?? readEnvVar("NEXTAUTH_SECRET") ?? "dev-member-pay-secret";
}

/** HMAC proof that a member-pay link was issued for gymId+memberId (AUDIT-014). */
export function signMemberPayToken(gymId: string, memberId: string): string {
  return crypto
    .createHmac("sha256", paySecret())
    .update(`${gymId}:${memberId}`)
    .digest("base64url");
}

export function verifyMemberPayToken(
  gymId: string,
  memberId: string,
  token: string,
): boolean {
  if (!token?.trim()) return false;
  const expected = signMemberPayToken(gymId, memberId);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(token.trim()),
    );
  } catch {
    return false;
  }
}
