import { NextRequest, NextResponse } from "next/server";
import { handleClientCredentialsGrant } from "@/lib/oauth/grants";

/**
 * OAuth 2.0 token endpoint (v1: client_credentials only).
 * ACCOUNT clients: account-scoped integrations (pass X-Gym-Id on resource APIs).
 * AGENT clients: gym-bound tokens for /api/agent/v1/* tools.
 */
export async function oauthTokenHandler(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_request", error_description: "JSON body required" },
      { status: 400 },
    );
  }

  const grantType =
    typeof body === "object" && body !== null && "grant_type" in body
      ? (body as { grant_type: string }).grant_type
      : null;

  if (grantType !== "client_credentials") {
    return NextResponse.json(
      {
        error: "unsupported_grant_type",
        error_description: "Only client_credentials is supported",
      },
      { status: 400 },
    );
  }

  const result = await handleClientCredentialsGrant(body);
  if (!result.ok) {
    return NextResponse.json(result.body, { status: result.status });
  }

  return NextResponse.json(result.token);
}
