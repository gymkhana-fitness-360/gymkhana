import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";
import { runCustomAnalyticsBySlug } from "@/domains/extensions/custom-analytics";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();

  const gymId = await resolveGymIdForUser(session.user.id, readRequestedGymIdFromRequest(request));
  if (!gymId) return ApiErrors.badRequest("No gym selected");

  const { slug } = await params;

  try {
    const output = await runCustomAnalyticsBySlug(gymId, slug);
    if (!output) return ApiErrors.notFound("Analytics definition not found");
    return NextResponse.json(output.result);
  } catch (error) {
    return ApiErrors.badRequest(error instanceof Error ? error.message : "Run failed");
  }
}
