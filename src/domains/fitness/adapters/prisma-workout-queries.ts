import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const workoutInclude = {
  WorkoutExercise: { orderBy: { createdAt: "asc" as const } },
  Member: { select: { id: true, name: true, phone: true } },
};

export async function listWorkoutsForMember(
  gymId: string,
  memberId: string,
  dateRange?: { startDate?: string | null; endDate?: string | null },
) {
  const where: Prisma.WorkoutWhereInput = { memberId, gymId };
  if (dateRange?.startDate || dateRange?.endDate) {
    where.date = {};
    if (dateRange.startDate) where.date.gte = new Date(dateRange.startDate);
    if (dateRange.endDate) where.date.lte = new Date(dateRange.endDate);
  }

  const workouts = await prisma.workout.findMany({
    where,
    include: workoutInclude,
    orderBy: { date: "desc" },
  });

  return {
    workouts,
    stats: {
      totalWorkouts: workouts.length,
      totalDuration: workouts.reduce((sum, w) => sum + (w.duration || 0), 0),
      totalCalories: workouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0),
      totalExercises: workouts.reduce((sum, w) => sum + w.WorkoutExercise.length, 0),
    },
  };
}

export type WorkoutExerciseInput = {
  exerciseName: string;
  sets?: number;
  reps?: number;
  weight?: number | null;
  restTime?: number | null;
  notes?: string;
};

export async function createWorkout(
  gymId: string,
  input: {
    memberId: string;
    name: string;
    description?: string;
    date: Date;
    duration: number | null;
    caloriesBurned: number | null;
    notes?: string;
    exercises?: WorkoutExerciseInput[];
  },
) {
  return prisma.workout.create({
    data: {
      memberId: input.memberId,
      gymId,
      name: input.name,
      description: input.description,
      date: input.date,
      duration: input.duration,
      caloriesBurned: input.caloriesBurned,
      notes: input.notes,
      WorkoutExercise: input.exercises?.length
        ? {
            create: input.exercises.map((ex) => ({
              exerciseName: ex.exerciseName,
              sets: ex.sets ?? 0,
              reps: ex.reps ?? 0,
              weight: ex.weight ?? null,
              restTime: ex.restTime ?? null,
              notes: ex.notes,
            })),
          }
        : undefined,
    },
    include: workoutInclude,
  });
}

export async function deleteWorkout(gymId: string, workoutId: string) {
  return prisma.workout.deleteMany({ where: { id: workoutId, gymId } });
}

export async function findMemberInGym(memberId: string, gymId: string) {
  return prisma.member.findUnique({ where: { id: memberId, gymId } });
}
