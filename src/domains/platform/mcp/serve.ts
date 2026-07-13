import { NextRequest, NextResponse } from "next/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { resolveOAuthPrincipal } from "@/lib/auth/resolve-request-auth";
import { createFitness360McpServer } from "@/lib/mcp/fitness360-mcp";

export async function handleMcpRequest(request: NextRequest): Promise<Response> {
  const principal = await resolveOAuthPrincipal(request);
  if (!principal || principal.kind !== "agent_oauth" || !principal.gymId) {
    return NextResponse.json(
      {
        error: "invalid_token",
        error_description:
          "AGENT OAuth Bearer required. Create credentials in Settings → AI & MCP.",
      },
      { status: 401 },
    );
  }

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  const mcp = createFitness360McpServer({
    gymId: principal.gymId,
    clientId: principal.clientId,
    scopes: principal.scopes,
  });

  await mcp.connect(transport);

  return transport.handleRequest(request, {
    authInfo: {
      token: request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "",
      clientId: principal.clientId,
      scopes: principal.scopes,
    },
  });
}
