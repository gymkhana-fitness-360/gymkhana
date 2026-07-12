import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PaymentStatus } from "@prisma/client";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { createLogger } from "@/lib/logger";
import { ApiErrors } from "@/lib/api-handler";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";

const logger = createLogger("api-payments");

/**
 * GET /api/payments/sent-status
 * Returns payments for which bill has not been sent (scoped to active gym).
 */
export async function paymentSentStatusHandler(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
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

    let cutoffDate: Date;
    const settingKey = `bills_sent_cutoff_date:${gymId}`;
    const cutoffSetting = await prisma.setting.findUnique({
      where: { key: settingKey },
    });
    if (cutoffSetting?.value) {
      cutoffDate = new Date(cutoffSetting.value);
    } else {
      cutoffDate = new Date(0);
    }

    const payments = await prisma.payment.findMany({
      where: {
        gymId,
        status: PaymentStatus.COMPLETED,
        billSentAt: null,
        receivedAt: { gte: cutoffDate },
      },
      orderBy: { receivedAt: "desc" },
      take: 500,
      include: {
        Member: {
          select: { id: true, name: true, phone: true },
        },
        User: { select: { name: true } },
      },
    });

    return NextResponse.json({
      payments,
      cutoffDate: cutoffDate.toISOString(),
    });
  } catch (error) {
    logger.error("[GET /api/payments/sent-status]", error as Error);
    return ApiErrors.internal(error instanceof Error ? error.message : "Failed to fetch");
  }
}
