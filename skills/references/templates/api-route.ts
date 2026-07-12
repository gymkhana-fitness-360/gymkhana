// Template: thin API route — copy and adapt
// See commands/new-api.md and rules/api-routes.mdc

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ApiErrors, getErrorMessage } from "@/lib/api-handler";
import { requireApiGymId } from "@/lib/api/gym-context";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { requirePermission } from "@/lib/permissions";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { exampleHandler } from "@/domains/example/handlers/example";
import { exampleBodySchema } from "@/domains/example/validation";

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "moderate");
  if (rl) return rl;

  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();

  const gymId = await requireApiGymId(session, request);
  if (gymId instanceof NextResponse) return gymId;

  const denied = requirePermission(session, "canEditMembers");
  if (denied) return denied;

  const parsed = await parseJsonBody(request, exampleBodySchema);
  if (!parsed.ok) return parsed.response;

  try {
    const data = await exampleHandler({ gymId, userId: session.user.id, ...parsed.data });
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return ApiErrors.internal(getErrorMessage(e));
  }
}
