import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { requireApiGymId } from "@/lib/api/gym-context";
import {
  applyFutureMembershipStackCleanup,
  previewFutureMembershipStackCleanup,
} from "@/domains/memberships/handlers/future-stack-cleanup";

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "moderate");
  if (rl) return rl;
  const session = await auth();
  if (!session) return ApiErrors.unauthorized();
  const gymId = await requireApiGymId(session, request);
  if (gymId instanceof NextResponse) return gymId;

  const preview = await previewFutureMembershipStackCleanup(gymId);
  return NextResponse.json({ success: true, data: preview });
}

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "moderate");
  if (rl) return rl;
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();
  const gymId = await requireApiGymId(session, request);
  if (gymId instanceof NextResponse) return gymId;

  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body.membershipIds) ? body.membershipIds : [];
  if (!ids.length) return ApiErrors.badRequest("membershipIds required");
  const result = await applyFutureMembershipStackCleanup(gymId, ids, session.user.id);
  return NextResponse.json({ success: true, data: result });
}
