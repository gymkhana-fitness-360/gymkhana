import { prisma } from "@/lib/prisma";
import {
  generateAccessToken,
  hashToken,
  isAccessTokenFormat,
} from "@/lib/oauth/crypto";
import { normalizeRequestedScopes } from "@/lib/rbac/agent-scopes";
import type { OAuthClient } from "@prisma/client";

const DEFAULT_TTL_SECONDS = 3600;

export type IssuedAccessToken = {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  scope: string;
  account_id: string;
  gym_id?: string;
};

export async function issueClientCredentialsToken(
  client: OAuthClient,
  requestedScopes?: string[],
  ttlSeconds = DEFAULT_TTL_SECONDS,
): Promise<IssuedAccessToken> {
  const scopes = normalizeRequestedScopes(requestedScopes, client.scopes);
  const raw = generateAccessToken();
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  await prisma.oAuthAccessToken.create({
    data: {
      tokenHash,
      clientId: client.clientId,
      accountId: client.accountId,
      gymId: client.type === "AGENT" ? client.gymId : null,
      scopes,
      expiresAt,
    },
  });

  return {
    access_token: raw,
    token_type: "Bearer",
    expires_in: ttlSeconds,
    scope: scopes.join(" "),
    account_id: client.accountId,
    ...(client.gymId ? { gym_id: client.gymId } : {}),
  };
}

export async function resolveBearerAccessToken(bearer: string) {
  const token = bearer.trim();
  if (!isAccessTokenFormat(token)) return null;

  const row = await prisma.oAuthAccessToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { OAuthClient: true },
  });
  if (!row || row.revokedAt) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;
  if (!row.OAuthClient.isActive || row.OAuthClient.revokedAt) return null;

  return { token: row, client: row.OAuthClient };
}

export async function revokeAccessToken(bearer: string): Promise<boolean> {
  const token = bearer.trim();
  if (!isAccessTokenFormat(token)) return false;
  const result = await prisma.oAuthAccessToken.updateMany({
    where: { tokenHash: hashToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return result.count > 0;
}
