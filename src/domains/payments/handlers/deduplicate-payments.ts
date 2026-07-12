import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";
import { parseJsonBody } from "@/lib/security/parse-json-body";

const mutatingBodySchema = z.any();
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";
import { toDateOnlyIST } from "@/lib/date-only";
import { createLogger } from "@/lib/logger";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import {
  clusterPaymentDuplicateIndices,
  pickPaymentDuplicateKeeper,
  type PayRowDedupe,
} from "@/lib/payment-dedupe-clustering";

const logger = createLogger("api-dedupe");
const TZ = "Asia/Kolkata";

function istDayKey(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}

export async function deduplicatePaymentsHandler(request: NextRequest) {
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

    const parsedBody = await parseJsonBody(request, mutatingBodySchema);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.data as any;
    const { execute = false } = body;

    const gymId = await resolveGymIdForUser(
      session.user.id,
      readRequestedGymIdFromRequest(request),
    );
    if (!gymId) {
      return ApiErrors.badRequest("No gym selected or account has no locations.");
    }

    logger.info(`Deduplication started: ${execute ? "EXECUTE" : "DRY-RUN"} by ${session.user.email} gym=${gymId}`);

    const all = await prisma.payment.findMany({
      where: { gymId, status: "COMPLETED" },
      select: {
        id: true,
        memberId: true,
        amount: true,
        receivedAt: true,
        createdAt: true,
        ExpectedPayment: { select: { id: true } },
      },
      orderBy: [{ memberId: "asc" }, { receivedAt: "asc" }],
    });

    const byMember = new Map<string, PayRowDedupe[]>();
    for (const p of all) {
      if (!byMember.has(p.memberId)) byMember.set(p.memberId, []);
      byMember.get(p.memberId)!.push(p as PayRowDedupe);
    }

    const toDelete = new Set<string>();
    const toUpdateAmount = new Map<string, number>();
    const membersTouched = new Set<string>();

    for (const [, bucket] of byMember) {
      const clusters = clusterPaymentDuplicateIndices(bucket);
      for (const idxs of clusters) {
        if (idxs.length < 2) continue;
        const keeperIdx = pickPaymentDuplicateKeeper(idxs, bucket);
        const keeper = bucket[keeperIdx]!;
        const amounts = idxs.map((i) => Number(bucket[i]!.amount));
        const targetAmount = Math.max(...amounts);

        for (const i of idxs) {
          const row = bucket[i]!;
          membersTouched.add(row.memberId);
          if (i === keeperIdx) {
            if (targetAmount !== Number(keeper.amount)) {
              toUpdateAmount.set(keeper.id, targetAmount);
            }
            continue;
          }
          toDelete.add(row.id);
        }
      }
    }

    const samples = [];
    let n = 0;
    for (const id of toDelete) {
      const row = all.find((x) => x.id === id);
      if (row && n++ < 15) {
        samples.push({
          id: id.slice(0, 8),
          memberId: row.memberId.slice(0, 8),
          amount: Number(row.amount),
          date: istDayKey(row.receivedAt),
        });
      }
    }

    const result = {
      mode: execute ? "execute" : "dry-run",
      totalCompletedPayments: all.length,
      duplicateRowsToDelete: toDelete.size,
      keepersAmountFix: toUpdateAmount.size,
      membersToRefresh: membersTouched.size,
      samples,
    };

    if (!execute) {
      logger.info("Dry run complete", result);
      return NextResponse.json(result);
    }

    const deletedIds = [...toDelete];

    await prisma.$transaction(async (tx) => {
      if (deletedIds.length > 0) {
        await tx.expectedPayment.updateMany({
          where: { paymentId: { in: deletedIds } },
          data: { paymentId: null },
        });
        await tx.payment.deleteMany({ where: { id: { in: deletedIds } } });
      }

      for (const [id, amt] of toUpdateAmount) {
        await tx.$executeRaw`
          UPDATE "Payment"
          SET amount = ${amt}::decimal(10, 2)
          WHERE id = ${id}
        `;
      }
    });

    const refreshMembers = new Set<string>(membersTouched);

    for (const memberId of refreshMembers) {
      const last = await prisma.payment.findFirst({
        where: { gymId, memberId, status: "COMPLETED" },
        orderBy: { receivedAt: "desc" },
        select: { receivedAt: true },
      });
      await prisma.member.update({
        where: { id: memberId },
        data: {
          lastPaymentDate: last ? toDateOnlyIST(last.receivedAt) : null,
        },
      });
    }

    logger.info(`Deduplication complete: deleted ${deletedIds.length} payments, refreshed ${refreshMembers.size} members`);

    return NextResponse.json({
      ...result,
      success: true,
      message: `Deleted ${deletedIds.length} duplicate payments and refreshed ${refreshMembers.size} members`,
    });
  } catch (error) {
    logger.error("Deduplication error:", error as Error);
    return ApiErrors.internal("Failed to deduplicate payments");
  }
}
