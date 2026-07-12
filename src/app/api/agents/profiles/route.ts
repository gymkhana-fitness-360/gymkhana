import { successResponse } from "@/lib/api-response";
import { AGENT_PROFILES } from "@/domains/agents/profiles";

export async function GET() {
  return successResponse({ profiles: AGENT_PROFILES });
}
