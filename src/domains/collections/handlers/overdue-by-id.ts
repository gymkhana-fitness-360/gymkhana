import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import { ApiErrors } from "@/lib/api-handler";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";
import { parseJsonBody } from "@/lib/security/parse-json-body";

const logger = createLogger("api-overdue");

const mutatingBodySchema = z
  .object({
    action: z.enum(["seen", "inactive"]).optional(),
    notes: z.string().optional(),
  })
  .passthrough();

export async function patchOverdueByIdHandler(
  request: NextRequest,
  id: string,
) {
  try {
    const session = await auth();
    if (!session) {
      return ApiErrors.unauthorized();
    }

    const gymId = await resolveGymIdForUser(
      session.user.id,
      readRequestedGymIdFromRequest(request),
    );
    const owned = gymId
      ? await prisma.overdueTracking.findFirst({ where: { id, gymId }, select: { id: true } })
      : null;
    if (!owned) {
      return ApiErrors.notFound("Overdue record not found");
    }

    const parsedBody = await parseJsonBody(request, mutatingBodySchema);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.data as { action?: string; notes?: string };
    const { action, notes } = body;

    const updateData: Record<string, unknown> = {};

    if (action === "seen") {
      updateData.lastSeenAt = new Date();
      updateData.notes = notes || "Member seen at gym";
    } else if (action === "inactive") {
      updateData.markedInactiveAt = new Date();
      updateData.notes = notes || "Marked as inactive - not attending for 7+ days";
    } else {
      return ApiErrors.validationError("Invalid action. Use 'seen' or 'inactive'");
    }

    const updated = await prisma.overdueTracking.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({
      success: true,
      record: updated,
    });
  } catch (error) {
    logger.error("Error updating overdue record:", error as Error);
    return ApiErrors.internal("Failed to update overdue record");
  }
}

export async function deleteOverdueByIdHandler(
  request: NextRequest,
  id: string,
) {
  try {
    const session = await auth();
    if (!session) {
      return ApiErrors.unauthorized();
    }

    const gymId = await resolveGymIdForUser(
      session.user.id,
      readRequestedGymIdFromRequest(request),
    );
    const deleted = gymId
      ? await prisma.overdueTracking.deleteMany({ where: { id, gymId } })
      : { count: 0 };
    if (deleted.count === 0) {
      return ApiErrors.notFound("Overdue record not found");
    }

    return NextResponse.json({
      success: true,
      message: "Member removed from overdue list",
    });
  } catch (error) {
    logger.error("Error deleting overdue record:", error as Error);
    return ApiErrors.internal("Failed to delete overdue record");
  }
}
