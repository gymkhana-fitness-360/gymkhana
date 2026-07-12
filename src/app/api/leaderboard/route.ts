import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { createLogger } from "@/lib/logger";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { requireApiGymId } from "@/lib/api/gym-context";

const logger = createLogger("api-leaderboard");

// Get leaderboard
export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session?.user) {
      return ApiErrors.unauthorized();
    }

    const gymId = await requireApiGymId(session, request);
    if (gymId instanceof NextResponse) {
      return gymId;
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'attendance'; // attendance, workouts, challenges
    const period = searchParams.get('period') || 'month'; // week, month, year, all-time
    const limit = parseInt(searchParams.get('limit') || '10', 10) || 10;

    let startDate: Date | undefined;
    const now = new Date();

    // Calculate start date based on period
    switch (period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate = undefined;
    }

    let leaderboard: any[] = [];

    if (type === 'attendance') {
      // Attendance leaderboard
      const attendanceData = await prisma.attendance.groupBy({
        by: ['memberId'],
        where: {
          gymId,
          ...(startDate
            ? {
                checkIn: {
                  gte: startDate,
                },
              }
            : {}),
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: limit,
      });

      // Get member details
      const memberIds = attendanceData.map(a => a.memberId);
      const members = await prisma.member.findMany({
        where: {
          gymId,
          id: {
            in: memberIds,
          },
        },
        select: {
          id: true,
          name: true,
          phone: true,
          photo: true,
        },
      });

      const memberMap = new Map(members.map(m => [m.id, m]));

      leaderboard = attendanceData.map((data, index) => ({
        rank: index + 1,
        Member: memberMap.get(data.memberId),
        value: data._count.id,
        label: 'check-ins',
      }));

    } else if (type === 'workouts') {
      // Workouts leaderboard
      const workoutData = await prisma.workout.groupBy({
        by: ['memberId'],
        where: {
          gymId,
          ...(startDate
            ? {
                date: {
                  gte: startDate,
                },
              }
            : {}),
        },
        _count: {
          id: true,
        },
        _sum: {
          caloriesBurned: true,
          duration: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: limit,
      });

      // Get member details
      const memberIds = workoutData.map(w => w.memberId);
      const members = await prisma.member.findMany({
        where: {
          gymId,
          id: {
            in: memberIds,
          },
        },
        select: {
          id: true,
          name: true,
          phone: true,
          photo: true,
        },
      });

      const memberMap = new Map(members.map(m => [m.id, m]));

      leaderboard = workoutData.map((data, index) => ({
        rank: index + 1,
        Member: memberMap.get(data.memberId),
        value: data._count.id,
        label: 'workouts',
        totalCalories: data._sum.caloriesBurned || 0,
        totalDuration: data._sum.duration || 0,
      }));

    } else if (type === 'challenges') {
      // Challenge wins leaderboard
      const challengeData = await prisma.challengeParticipant.groupBy({
        by: ['memberId'],
        where: {
          gymId,
          isWinner: true,
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: limit,
      });

      // Get member details
      const memberIds = challengeData.map(c => c.memberId);
      const members = await prisma.member.findMany({
        where: {
          gymId,
          id: {
            in: memberIds,
          },
        },
        select: {
          id: true,
          name: true,
          phone: true,
          photo: true,
        },
      });

      const memberMap = new Map(members.map(m => [m.id, m]));

      leaderboard = challengeData.map((data, index) => ({
        rank: index + 1,
        Member: memberMap.get(data.memberId),
        value: data._count.id,
        label: 'challenge wins',
      }));
    }

    return NextResponse.json({
      leaderboard,
      type,
      period,
      startDate,
    });
  } catch (error) {
    logger.error('Error fetching leaderboard:', error as Error);
    return ApiErrors.internal('Failed to fetch leaderboard');
  }
}
