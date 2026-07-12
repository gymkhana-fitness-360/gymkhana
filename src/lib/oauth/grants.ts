import { z } from "zod";
import { validateOAuthClientCredentials } from "@/lib/oauth/clients";
import { issueClientCredentialsToken } from "@/lib/oauth/tokens";
import { parseAgentScopes } from "@/lib/rbac/agent-scopes";

const clientCredentialsSchema = z.object({
  grant_type: z.literal("client_credentials"),
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
  scope: z.string().optional(),
});

export type TokenGrantError = {
  error: "invalid_request" | "invalid_client" | "invalid_scope" | "unsupported_grant_type";
  error_description: string;
};

export async function handleClientCredentialsGrant(
  body: unknown,
): Promise<{ ok: true; token: Awaited<ReturnType<typeof issueClientCredentialsToken>> } | { ok: false; status: number; body: TokenGrantError }> {
  const parsed = clientCredentialsSchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      body: { error: "invalid_request", error_description: "grant_type must be client_credentials" },
    };
  }

  const client = await validateOAuthClientCredentials(
    parsed.data.client_id,
    parsed.data.client_secret,
  );
  if (!client) {
    return {
      ok: false,
      status: 401,
      body: { error: "invalid_client", error_description: "Invalid client credentials" },
    };
  }

  const requested = parsed.data.scope
    ? parsed.data.scope.split(/\s+/).filter(Boolean)
    : undefined;

  if (requested?.length) {
    const valid = parseAgentScopes(requested);
    if (valid.length === 0) {
      return {
        ok: false,
        status: 400,
        body: { error: "invalid_scope", error_description: "No valid scopes requested" },
      };
    }
  }

  const token = await issueClientCredentialsToken(client, requested);
  return { ok: true, token };
}
