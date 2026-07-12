import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { ApiErrors } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";
import { requirePermission, PermissionError } from "@/lib/permissions";
import { requireApiGymId } from "@/lib/api/gym-context";
import { memberBelongsToGym } from "@/lib/gym-scope";
import {
  createWorkout,
  deleteWorkout,
  findMemberInGym,
  listWorkoutsForMember,
} from "../adapters/prisma-workout-queries";

const mutatingBodySchema = z
  .object({
    memberId: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    date: z
      .string()
      .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date")
      .optional(),
    duration: z.union([z.string(), z.number()]).optional(),
    caloriesBurned: z.union([z.string(), z.number()]).optional(),
    notes: z.string().optional(),
    exercises: z
      .array(
        z.object({
          exerciseName: z.string(),
          sets: z.union([z.string(), z.number()]).optional(),
          reps: z.union([z.string(), z.number()]).optional(),
          weight: z.union([z.string(), z.number()]).optional(),
          restTime: z.union([z.string(), z.number()]).optional(),
          notes: z.string().optional(),
        }),
      )
      .optional(),
  })
  .passthrough();

function parseOptionalInt(value: unknown): number | null {
  if (value == null || String(value).trim() === "") return null;
  const n = parseInt(String(value), 10);
  return Number.isNaN(n) ? null : n;
}

async function requireMemberAccess(
  session: Session,
  request: NextRequest,
  memberId: string,
): Promise<string | NextResponse> {
  try {
    requirePermission(session, "canViewMembers");
  } catch (error) {
    if (error instanceof PermissionError) return ApiErrors.forbidden();
    throw error;
  }

  const gymId = await requireApiGymId(session, request);
  if (gymId instanceof NextResponse) return gymId;

  const allowed = await memberBelongsToGym(memberId, gymId);
  if (!allowed) return ApiErrors.notFound("Member");

  return gymId;
}

export async function listWorkoutsHandler(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return ApiErrors.unauthorized();

  const memberId = request.nextUrl.searchParams.get("memberId");
  if (!memberId) return ApiErrors.validationError("Member ID required");

  const gymId = await requireMemberAccess(session, request, memberId);
  if (gymId instanceof NextResponse) return gymId;

  const result = await listWorkoutsForMember(gymId, memberId, {
    startDate: request.nextUrl.searchParams.get("startDate"),
    endDate: request.nextUrl.searchParams.get("endDate"),
  });

  return successResponse(result);
}

export async function createWorkoutHandler(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return ApiErrors.unauthorized();

  try {
    requirePermission(session, "canEditMembers");
  } catch (error) {
    if (error instanceof PermissionError) return ApiErrors.forbidden();
    throw error;
  }

  const parsedBody = await parseJsonBody(request, mutatingBodySchema);
  if (!parsedBody.ok) return parsedBody.response;
  const { memberId, name, description, date, duration, caloriesBurned, notes, exercises } = parsedBody.data;

  if (!memberId || !name) {
    return ApiErrors.validationError("Member ID and workout name required");
  }

  const gymId = await requireApiGymId(session, request);
  if (gymId instanceof NextResponse) return gymId;

  const allowed = await memberBelongsToGym(memberId, gymId);
  if (!allowed) return ApiErrors.notFound("Member");

  const member = await findMemberInGym(memberId, gymId);
  if (!member) return ApiErrors.notFound("Member");

  const workout = await createWorkout(gymId, {
    memberId,
    name,
    description,
    date: date ? new Date(date) : new Date(),
    duration: parseOptionalInt(duration),
    caloriesBurned: parseOptionalInt(caloriesBurned),
    notes,
    exercises: exercises?.map((ex) => ({
      exerciseName: ex.exerciseName,
      sets: parseInt(String(ex.sets), 10) || 0,
      reps: parseInt(String(ex.reps), 10) || 0,
      weight: ex.weight ? parseFloat(String(ex.weight)) : null,
      restTime: parseOptionalInt(ex.restTime),
      notes: ex.notes,
    })),
  });

  return successResponse(workout, 201);
}

export async function deleteWorkoutHandler(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return ApiErrors.unauthorized();

  try {
    requirePermission(session, "canEditMembers");
  } catch (error) {
    if (error instanceof PermissionError) return ApiErrors.forbidden();
    throw error;
  }

  const workoutId = request.nextUrl.searchParams.get("workoutId");
  if (!workoutId) return ApiErrors.validationError("Workout ID required");

  const gymId = await requireApiGymId(session, request);
  if (gymId instanceof NextResponse) return gymId;

  const deleted = await deleteWorkout(gymId, workoutId);
  if (deleted.count === 0) return ApiErrors.notFound("Workout");

  return successResponse({ message: "Workout deleted successfully" });
}
