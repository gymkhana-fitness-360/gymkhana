import { NextRequest } from "next/server";
import { ChallengeStatus, ChallengeType, Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { ApiErrors, validateEnumParam } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";
import {
  createChallenge,
  deleteChallenge,
  listChallenges,
  updateChallenge,
} from "../adapters/prisma-challenge-queries";

const mutatingBodySchema = z
  .object({
    challengeId: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    type: z.nativeEnum(ChallengeType).optional(),
    status: z.nativeEnum(ChallengeStatus).optional(),
    startDate: z
      .string()
      .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date")
      .optional(),
    endDate: z
      .string()
      .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date")
      .optional(),
    targetValue: z.union([z.string(), z.number()]).optional(),
    prize: z.string().optional(),
  })
  .passthrough();

async function resolveGym(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return { error: ApiErrors.unauthorized() } as const;
  const gymId = await resolveGymIdForUser(
    session.user.id,
    readRequestedGymIdFromRequest(request),
  );
  if (!gymId) {
    return { error: ApiErrors.validationError("No gym selected or account has no locations.") } as const;
  }
  return { session, gymId };
}

export async function listChallengesHandler(request: NextRequest) {
  const ctx = await resolveGym(request);
  if ("error" in ctx) return ctx.error;

  const statusValidation = validateEnumParam(
    request.nextUrl.searchParams.get("status"),
    ChallengeStatus,
    "status",
  );
  if (statusValidation.error) return statusValidation.error;

  const challenges = await listChallenges(ctx.gymId, {
    status: statusValidation.value,
    memberId: request.nextUrl.searchParams.get("memberId"),
  });
  return successResponse({ challenges });
}

export async function createChallengeHandler(request: NextRequest) {
  const ctx = await resolveGym(request);
  if ("error" in ctx) return ctx.error;
  if (ctx.session.user.role !== "ADMIN") return ApiErrors.forbidden("Admin access required");

  const parsedBody = await parseJsonBody(request, mutatingBodySchema);
  if (!parsedBody.ok) return parsedBody.response;
  const { name, description, type, startDate, endDate, targetValue, prize, status } = parsedBody.data;

  if (!name || !type || !startDate || !endDate) {
    return ApiErrors.validationError("Missing required fields");
  }

  const challenge = await createChallenge(ctx.gymId, {
    name,
    description,
    type,
    status,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    targetValue:
      targetValue != null && String(targetValue).trim() !== ""
        ? (() => {
            const v = parseInt(String(targetValue), 10);
            return Number.isNaN(v) ? null : v;
          })()
        : null,
    prize,
  });

  return successResponse(challenge, 201);
}

export async function updateChallengeHandler(request: NextRequest) {
  const ctx = await resolveGym(request);
  if ("error" in ctx) return ctx.error;
  if (ctx.session.user.role !== "ADMIN") return ApiErrors.forbidden("Admin access required");

  const parsedBody = await parseJsonBody(request, mutatingBodySchema);
  if (!parsedBody.ok) return parsedBody.response;
  const { challengeId, gymId: _bodyGymId, ...updateData } = parsedBody.data as Record<string, unknown>;

  if (!challengeId || typeof challengeId !== "string") {
    return ApiErrors.validationError("Challenge ID required");
  }

  const data = { ...updateData } as Prisma.ChallengeUpdateInput;
  if (data.startDate) data.startDate = new Date(String(data.startDate));
  if (data.endDate) data.endDate = new Date(String(data.endDate));
  if (data.targetValue != null && String(data.targetValue).trim() !== "") {
    const v = parseInt(String(data.targetValue), 10);
    data.targetValue = Number.isNaN(v) ? null : v;
  }

  const challenge = await updateChallenge(ctx.gymId, challengeId, data);
  if (!challenge) return ApiErrors.notFound("Challenge");
  return successResponse(challenge);
}

export async function deleteChallengeHandler(request: NextRequest) {
  const ctx = await resolveGym(request);
  if ("error" in ctx) return ctx.error;
  if (ctx.session.user.role !== "ADMIN") return ApiErrors.forbidden("Admin access required");

  const challengeId = request.nextUrl.searchParams.get("challengeId");
  if (!challengeId) return ApiErrors.validationError("Challenge ID required");

  const deleted = await deleteChallenge(ctx.gymId, challengeId);
  if (deleted.count === 0) return ApiErrors.notFound("Challenge");
  return successResponse({ message: "Challenge deleted successfully" });
}
