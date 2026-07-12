import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import {
  createCustomEntity,
  createEntitySchema,
  listCustomEntities,
} from "@/domains/extensions/custom-entities";

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();

  const gymId = await resolveGymIdForUser(session.user.id, readRequestedGymIdFromRequest(request));
  if (!gymId) return ApiErrors.badRequest("No gym selected");

  const entities = await listCustomEntities(gymId);
  return NextResponse.json(entities);
}

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();
  if (session.user.role !== "ADMIN") return ApiErrors.forbidden("Admin required");

  const gymId = await resolveGymIdForUser(session.user.id, readRequestedGymIdFromRequest(request));
  if (!gymId) return ApiErrors.badRequest("No gym selected");

  const parsed = await parseJsonBody(request, createEntitySchema);
  if (!parsed.ok) return parsed.response;

  try {
    const entity = await createCustomEntity(gymId, parsed.data);
    return NextResponse.json(entity, { status: 201 });
  } catch {
    return ApiErrors.badRequest("Could not create entity (slug may already exist)");
  }
}
