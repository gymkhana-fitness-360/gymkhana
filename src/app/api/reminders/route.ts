import { NextRequest, NextResponse } from 'next/server';

import { z } from "zod";
import { parseJsonBody } from "@/lib/security/parse-json-body";

const mutatingBodySchema = z.object({
  memberId: z.string().optional(),
  type: z.nativeEnum(ReminderType).optional(),
  message: z.string().optional(),
  scheduledFor: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date").optional(),
}).passthrough();
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma, ReminderStatus, ReminderType } from '@prisma/client';
import { withRateLimit } from '@/lib/middleware/rate-limit';
import { createLogger } from "@/lib/logger";
import { ApiErrors, validateEnumParam } from "@/lib/api-handler";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";

const logger = createLogger("api-reminders");

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, 'lenient');
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session) {
      return ApiErrors.unauthorized();
    }

    const gymId = await resolveGymIdForUser(
      session.user.id,
      readRequestedGymIdFromRequest(request),
    );
    if (!gymId) {
      return ApiErrors.badRequest("No gym selected or account has no locations.");
    }

    const { searchParams } = new URL(request.url);
    const statusValidation = validateEnumParam(searchParams.get('status'), ReminderStatus, 'status');
    if (statusValidation.error) return statusValidation.error;
    const typeValidation = validateEnumParam(searchParams.get('type'), ReminderType, 'type');
    if (typeValidation.error) return typeValidation.error;

    const where: Prisma.ReminderWhereInput = { gymId };
    if (statusValidation.value) {
      where.status = statusValidation.value;
    }
    if (typeValidation.value) {
      where.type = typeValidation.value;
    }

    const reminders = await prisma.reminder.findMany({
      where,
      include: {
        Member: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
      orderBy: {
        scheduledFor: 'asc',
      },
      take: 100,
    });

    return NextResponse.json(reminders);
  } catch (error) {
    logger.error('Error fetching reminders:', error as Error);
    return ApiErrors.internal('Failed to fetch reminders');
  }
}

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, 'strict');
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session) {
      return ApiErrors.unauthorized();
    }

    const gymId = await resolveGymIdForUser(
      session.user.id,
      readRequestedGymIdFromRequest(request),
    );
    if (!gymId) {
      return ApiErrors.badRequest("No gym selected or account has no locations.");
    }

    const parsedBody = await parseJsonBody(request, mutatingBodySchema);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.data as any;
    const { memberId, type, message, scheduledFor } = body;

    if (!memberId || !type || !message || !scheduledFor) {
      return ApiErrors.validationError('Missing required fields');
    }

    const member = await prisma.member.findFirst({
      where: { id: memberId, gymId },
      select: { gymId: true },
    });
    if (!member) {
      return ApiErrors.notFound('Member');
    }

    const reminder = await prisma.reminder.create({
      data: {
        memberId,
        gymId: member.gymId,
        type,
        message,
        scheduledFor: new Date(scheduledFor),
      },
      include: {
        Member: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    return NextResponse.json(reminder);
  } catch (error) {
    logger.error('Error creating reminder:', error as Error);
    return ApiErrors.internal('Failed to create reminder');
  }
}
