import { ChallengeStatus, ChallengeType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const participantInclude = {
  ChallengeParticipant: {
    include: {
      Member: {
        select: { id: true, name: true, phone: true, photo: true },
      },
    },
    orderBy: { currentValue: "desc" as const },
  },
};

export async function listChallenges(
  gymId: string,
  filters: { status?: ChallengeStatus | null; memberId?: string | null },
) {
  const where: Prisma.ChallengeWhereInput = { gymId };
  if (filters.status) where.status = filters.status;
  if (filters.memberId) {
    where.ChallengeParticipant = { some: { memberId: filters.memberId, gymId } };
  }

  return prisma.challenge.findMany({
    where,
    include: participantInclude,
    orderBy: { startDate: "desc" },
    take: 200,
  });
}

export async function createChallenge(
  gymId: string,
  data: {
    name: string;
    description?: string;
    type: ChallengeType;
    status?: ChallengeStatus;
    startDate: Date;
    endDate: Date;
    targetValue: number | null;
    prize?: string;
  },
) {
  return prisma.challenge.create({
    data: {
      gymId,
      name: data.name,
      description: data.description ?? "",
      type: data.type,
      status: data.status || ChallengeStatus.UPCOMING,
      startDate: data.startDate,
      endDate: data.endDate,
      targetValue: data.targetValue,
      prize: data.prize,
    },
    include: participantInclude,
  });
}

export async function updateChallenge(
  gymId: string,
  challengeId: string,
  data: Prisma.ChallengeUpdateInput,
) {
  const existing = await prisma.challenge.findFirst({
    where: { id: challengeId, gymId },
    select: { id: true },
  });
  if (!existing) return null;

  return prisma.challenge.update({
    where: { id: challengeId },
    data,
    include: participantInclude,
  });
}

export async function deleteChallenge(gymId: string, challengeId: string) {
  return prisma.challenge.deleteMany({ where: { id: challengeId, gymId } });
}
