import type { OAuthClientType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  generateClientId,
  generateClientSecret,
  hashClientSecret,
  verifyClientSecret,
} from "@/lib/oauth/crypto";
import {
  DEFAULT_ACCOUNT_CLIENT_SCOPES,
  DEFAULT_AGENT_CLIENT_SCOPES,
  parseAgentScopes,
} from "@/lib/rbac/agent-scopes";

export type CreateOAuthClientInput = {
  type: OAuthClientType;
  accountId: string;
  gymId?: string | null;
  name: string;
  scopes?: string[];
};

export type CreateOAuthClientResult = {
  clientId: string;
  clientSecret: string;
  scopes: string[];
};

export async function createOAuthClient(
  input: CreateOAuthClientInput,
): Promise<CreateOAuthClientResult> {
  if (input.type === "AGENT" && !input.gymId) {
    throw new Error("AGENT OAuth clients require gymId");
  }
  if (input.type === "ACCOUNT" && input.gymId) {
    throw new Error("ACCOUNT OAuth clients must not set gymId");
  }

  const defaultScopes =
    input.type === "AGENT"
      ? DEFAULT_AGENT_CLIENT_SCOPES
      : DEFAULT_ACCOUNT_CLIENT_SCOPES;
  const scopes = input.scopes?.length
    ? parseAgentScopes(input.scopes)
    : defaultScopes;

  const clientId = generateClientId();
  const clientSecret = generateClientSecret();
  const clientSecretHash = await hashClientSecret(clientSecret);

  await prisma.oAuthClient.create({
    data: {
      clientId,
      clientSecretHash,
      type: input.type,
      accountId: input.accountId,
      gymId: input.type === "AGENT" ? input.gymId! : null,
      name: input.name,
      scopes,
    },
  });

  return { clientId, clientSecret, scopes };
}

export async function validateOAuthClientCredentials(
  clientId: string,
  clientSecret: string,
) {
  const client = await prisma.oAuthClient.findUnique({
    where: { clientId },
  });
  if (!client || !client.isActive || client.revokedAt) {
    return null;
  }
  const ok = await verifyClientSecret(clientSecret, client.clientSecretHash);
  if (!ok) return null;
  return client;
}
