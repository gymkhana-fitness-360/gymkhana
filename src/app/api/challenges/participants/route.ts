import { NextRequest, NextResponse } from 'next/server';

import { z } from "zod";
import { parseJsonBody } from "@/lib/security/parse-json-body";

const mutatingBodySchema = z.object({
  challengeId: z.string().optional(),
  memberId: z.string().optional(),
  participantId: z.string().optional(),
  currentValue: z.union([z.string(), z.number()]).optional(),
  rank: z.union([z.string(), z.number()]).optional(),
  isWinner: z.boolean().optional(),
}).passthrough();
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { createLogger } from "@/lib/logger";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";

const logger = createLogger("api-challenges");

// Join challenge
export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session?.user) {
      return ApiErrors.unauthorized();
    }

    const parsedBody = await parseJsonBody(request, mutatingBodySchema);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.data as any;
    const { challengeId, memberId } = body;

    if (!challengeId || !memberId) {
      return ApiErrors.validationError('Challenge ID and Member ID required');
    }

    // Check if already participating
    const existing = await prisma.challengeParticipant.findUnique({
      where: {
        challengeId_memberId: {
          challengeId,
          memberId,
        },
      },
    });

    if (existing) {
      return ApiErrors.validationError('Already participating in this challenge');
    }

    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      select: { gymId: true },
    });
    if (!challenge) {
      return ApiErrors.validationError('Challenge not found');
    }

    const participant = await prisma.challengeParticipant.create({
      data: {
        challengeId,
        memberId,
        gymId: challenge.gymId,
      },
      include: {
        Member: {
          select: {
            id: true,
            name: true,
            phone: true,
            photo: true,
          },
        },
        Challenge: {
          select: {
            id: true,
            name: true,
            type: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    });

    return NextResponse.json(participant, { status: 201 });
  } catch (error) {
    logger.error('Error joining challenge:', error as Error);
    return ApiErrors.internal('Failed to join challenge');
  }
}

// Update participant progress
export async function PATCH(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session?.user) {
      return ApiErrors.unauthorized();
    }

    const parsedBody = await parseJsonBody(request, mutatingBodySchema);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.data as any;
    const { participantId, currentValue, rank, isWinner } = body;

    if (!participantId) {
      return ApiErrors.validationError('Participant ID required');
    }

    const updateData: Prisma.ChallengeParticipantUpdateInput = {};
    if (currentValue !== undefined) {
      updateData.currentValue = parseInt(String(currentValue), 10) || 0;
    }
    if (rank !== undefined) {
      updateData.rank = parseInt(String(rank), 10) || 0;
    }
    if (isWinner !== undefined) {
      updateData.isWinner = Boolean(isWinner);
    }

    const participant = await prisma.challengeParticipant.update({
      where: { id: participantId },
      data: updateData,
      include: {
        Member: {
          select: {
            id: true,
            name: true,
            phone: true,
            photo: true,
          },
        },
        Challenge: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    return NextResponse.json(participant);
  } catch (error) {
    logger.error('Error updating participant:', error as Error);
    return ApiErrors.internal('Failed to update participant');
  }
}

// Leave challenge
export async function DELETE(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session?.user) {
      return ApiErrors.unauthorized();
    }

    const searchParams = request.nextUrl.searchParams;
    const participantId = searchParams.get('participantId');

    if (!participantId) {
      return ApiErrors.validationError('Participant ID required');
    }

    await prisma.challengeParticipant.delete({
      where: { id: participantId },
    });

    return NextResponse.json({ message: 'Left challenge successfully' });
  } catch (error) {
    logger.error('Error leaving challenge:', error as Error);
    return ApiErrors.internal('Failed to leave challenge');
  }
}
