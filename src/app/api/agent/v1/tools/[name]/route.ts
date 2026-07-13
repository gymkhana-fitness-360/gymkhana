import type { NextRequest } from "next/server";
import { dispatchAgentToolHandler } from "@/domains/platform/agent/tool-dispatch";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  return dispatchAgentToolHandler(request, name);
}
