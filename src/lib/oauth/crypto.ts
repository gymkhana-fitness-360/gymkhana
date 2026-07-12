import { createHash, randomBytes } from "crypto";
import { hash, compare } from "bcryptjs";

const TOKEN_PREFIX = "gf_at_";
const CLIENT_ID_PREFIX = "gf_ci_";
const CLIENT_SECRET_PREFIX = "gf_cs_";

export function generateClientId(): string {
  return `${CLIENT_ID_PREFIX}${randomBytes(16).toString("hex")}`;
}

export function generateClientSecret(): string {
  return `${CLIENT_SECRET_PREFIX}${randomBytes(32).toString("hex")}`;
}

export function generateAccessToken(): string {
  return `${TOKEN_PREFIX}${randomBytes(32).toString("hex")}`;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashClientSecret(secret: string): Promise<string> {
  return hash(secret, 10);
}

export async function verifyClientSecret(secret: string, hashStored: string): Promise<boolean> {
  return compare(secret, hashStored);
}

export function isAccessTokenFormat(token: string): boolean {
  return token.startsWith(TOKEN_PREFIX) && token.length > TOKEN_PREFIX.length + 16;
}
