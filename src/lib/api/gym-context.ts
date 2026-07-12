import type { NextRequest } from "next/server";
import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";

export async function getApiGymId(
  session: Session,
  request: NextRequest,
): Promise<string | null> {
  return resolveGymIdForUser(
    session.user.id,
    readRequestedGymIdFromRequest(request),
    request,
  );
}

/** Resolves gym for the session or returns a 403 JSON response */
export async function requireApiGymId(
  session: Session,
  request: NextRequest,
): Promise<string | NextResponse> {
  const gymId = await getApiGymId(session, request);
  if (!gymId) {
    return NextResponse.json(
      { success: false, error: "No gym access", code: "GYM_FORBIDDEN" },
      { status: 403 },
    );
  }
  return gymId;
}
