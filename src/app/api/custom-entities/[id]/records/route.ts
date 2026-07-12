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
  createCustomEntityRecord,
  createRecordSchema,
  listCustomEntityRecords,
} from "@/domains/extensions/custom-entities";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();

  const gymId = await resolveGymIdForUser(session.user.id, readRequestedGymIdFromRequest(request));
  if (!gymId) return ApiErrors.badRequest("No gym selected");

  const { id } = await params;
  const result = await listCustomEntityRecords(gymId, id);
  if (!result) return ApiErrors.notFound("Entity not found");

  return NextResponse.json(result);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();

  const gymId = await resolveGymIdForUser(session.user.id, readRequestedGymIdFromRequest(request));
  if (!gymId) return ApiErrors.badRequest("No gym selected");

  const parsed = await parseJsonBody(request, createRecordSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await params;
  const record = await createCustomEntityRecord(gymId, id, parsed.data);
  if (!record) return ApiErrors.notFound("Entity not found");

  return NextResponse.json(record, { status: 201 });
}
