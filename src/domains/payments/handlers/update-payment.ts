import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getGymContext, GymContextError } from "@/domains/tenancy";
import { prisma } from "@/lib/prisma";
import { ApiErrors } from "@/lib/api-handler";
import { logAction } from "@/lib/audit-logger";
import { buildPaymentDeleteUndoSnapshot } from "@/lib/services/payment-delete-undo-snapshot";

const patchPaymentSchema = z.object({
  packageDuration: z.string().max(100).nullable().optional(),
  isPersonalTrainer: z.boolean().optional(),
});

export async function updatePaymentHandler(
  req: NextRequest,
  paymentId: string,
): Promise<NextResponse> {
  try {
    const { gymId } = await getGymContext(req);
    const json = await req.json().catch(() => null);
    const parsed = patchPaymentSchema.safeParse(json);
    if (!parsed.success) {
      return ApiErrors.validationError("Validation failed", parsed.error.issues);
    }

    const updateData: { packageDuration?: string | null; isPersonalTrainer?: boolean } = {};
    if (parsed.data.packageDuration !== undefined) {
      updateData.packageDuration =
        parsed.data.packageDuration === "" ? null : parsed.data.packageDuration;
    }
    if (parsed.data.isPersonalTrainer !== undefined) {
      updateData.isPersonalTrainer = parsed.data.isPersonalTrainer;
    }
    if (Object.keys(updateData).length === 0) {
      return ApiErrors.validationError("No fields to update");
    }

    const existing = await prisma.payment.findFirst({
      where: { id: paymentId, gymId },
      select: { id: true },
    });
    if (!existing) {
      return ApiErrors.notFound("Payment");
    }

    const payment = await prisma.payment.update({
      where: { id: paymentId },
      data: updateData,
      include: {
        Member: { select: { name: true, phone: true } },
        User: { select: { name: true } },
      },
    });

    return NextResponse.json(payment);
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}

export async function deletePaymentHandler(
  req: NextRequest,
  paymentId: string,
  userId: string,
): Promise<NextResponse> {
  try {
    const { gymId } = await getGymContext(req);
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, gymId },
      include: { Member: { select: { name: true } } },
    });
    if (!payment) {
      return ApiErrors.notFound("Payment");
    }

    const undoSnapshot = await buildPaymentDeleteUndoSnapshot(
      paymentId,
      gymId,
      payment.Member.name,
    );

    await prisma.$transaction(async (tx) => {
      await tx.expectedPayment.updateMany({
        where: { paymentId, gymId },
        data: { paymentId: null },
      });
      await tx.membership.deleteMany({
        where: { gymId, sourcePaymentId: paymentId },
      });
      await tx.payment.delete({ where: { id: paymentId } });
    });

    await logAction(userId, "payment_deleted", "Payment", paymentId, {
      gymId,
      memberId: payment.memberId,
      memberName: payment.Member.name,
      amount: payment.amount.toString(),
      undoSnapshot,
    });

    return NextResponse.json({ success: true, undoAvailable: true });
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
