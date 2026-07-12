import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";

export class GymContextError extends Error {
  readonly statusCode: 401 | 400;

  constructor(statusCode: 401 | 400, message: string) {
    super(message);
    this.name = "GymContextError";
    this.statusCode = statusCode;
  }
}

export type AuthenticatedGymContext = {
  gymId: string;
  userId: string;
};

/**
 * Resolves the active gym for the authenticated dashboard user from headers/cookies on the request.
 * Throws {@link GymContextError} when unauthenticated or no gym is available.
 */
export async function getGymContext(req: NextRequest): Promise<AuthenticatedGymContext> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new GymContextError(401, "Authentication required");
  }
  const gymId = await resolveGymIdForUser(
    session.user.id,
    readRequestedGymIdFromRequest(req),
    req,
  );
  if (!gymId) {
    throw new GymContextError(400, "No gym selected or account has no locations.");
  }
  return { gymId, userId: session.user.id };
}
