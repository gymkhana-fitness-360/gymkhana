import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { handleMcpRequest } from "@/domains/platform/mcp/serve";

export const runtime = "nodejs";
export const maxDuration = 60;

async function mcpRoute(request: NextRequest) {
  const limited = withRateLimit(request, "mcpHosted");
  if (limited) return limited;
  return handleMcpRequest(request);
}

export async function GET(request: NextRequest) {
  return mcpRoute(request);
}

export async function POST(request: NextRequest) {
  return mcpRoute(request);
}

export async function DELETE(request: NextRequest) {
  return mcpRoute(request);
}
