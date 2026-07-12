import { NextRequest, NextResponse } from "next/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { resolveOAuthPrincipal } from "@/lib/auth/resolve-request-auth";
import { createFitness360McpServer } from "@/lib/mcp/fitness360-mcp";
import { withRateLimit } from "@/lib/middleware/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

async function handleMcpRequest(request: NextRequest): Promise<Response> {
  const limited = withRateLimit(request, "mcpHosted");
  if (limited) return limited;

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

export async function GET(request: NextRequest) {
  return handleMcpRequest(request);
}

export async function POST(request: NextRequest) {
  return handleMcpRequest(request);
}

export async function DELETE(request: NextRequest) {
  return handleMcpRequest(request);
}
