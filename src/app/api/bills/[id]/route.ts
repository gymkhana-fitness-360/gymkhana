import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";
import { resourceBelongsToGym } from "@/domains/tenancy";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { createLogger } from "@/lib/logger";
import { ApiErrors } from "@/lib/api-handler";

const logger = createLogger("api-bills");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const gymId = await resolveGymIdForUser(
      session.user.id,
      readRequestedGymIdFromRequest(request),
    );
    if (!gymId) {
      return ApiErrors.badRequest("No gym selected or account has no locations.");
    }

    const { id } = await params;
    const bill = await prisma.bill.findFirst({
      where: { id, deletedAt: null },
      include: {
        Member: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        User: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!resourceBelongsToGym(bill, gymId)) {
      return ApiErrors.notFound("Bill");
    }

    return NextResponse.json(bill);
  } catch (error) {
    logger.error("Error fetching bill:", error as Error);
    return ApiErrors.internal("Failed to fetch bill");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    if (session.user.role !== "ADMIN") {
      return ApiErrors.forbidden("Admin access required");
    }

    const gymId = await resolveGymIdForUser(
      session.user.id,
      readRequestedGymIdFromRequest(request),
    );
    if (!gymId) {
      return ApiErrors.badRequest("No gym selected or account has no locations.");
    }

    const { id } = await params;
    const bill = await prisma.bill.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, gymId: true },
    });
    if (!resourceBelongsToGym(bill, gymId)) {
      return ApiErrors.notFound("Bill");
    }

    await prisma.bill.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting bill:", error as Error);
    return ApiErrors.internal("Failed to delete bill");
  }
}
