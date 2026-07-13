import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { oauthTokenHandler } from "@/domains/identity/handlers/oauth-token";

export async function POST(request: NextRequest) {
  const limited = withRateLimit(request, "strict");
  if (limited) return limited;
  return oauthTokenHandler(request);
}
