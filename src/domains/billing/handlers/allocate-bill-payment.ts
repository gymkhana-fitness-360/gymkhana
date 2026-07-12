import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PaymentMethod } from "@prisma/client";
import { getGymContext, GymContextError } from "@/domains/tenancy";
import { prisma } from "@/lib/prisma";
import { ApiErrors } from "@/lib/api-handler";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { auth } from "@/lib/auth";
import { allocatePaymentToBill } from "@/lib/billing/invoice-ledger";
import { createPayment } from "@/lib/services/payment.service";

const schema = z.object({
  amount: z.number().positive(),
  paymentMethod: z.nativeEnum(PaymentMethod),
  note: z.string().max(500).optional(),
  createPayment: z.boolean().optional(),
  planId: z.string().optional(),
});

export async function allocateBillPaymentHandler(
  req: NextRequest,
  billId: string
): Promise<NextResponse> {
  try {
    const { gymId } = await getGymContext(req);
    const session = await auth();
    if (!session?.user?.id) return ApiErrors.unauthorized();

    const parsed = await parseJsonBody(req, schema);
    if (!parsed.ok) return parsed.response;

    const bill = await prisma.bill.findFirst({
      where: { id: billId, gymId, deletedAt: null },
    });
    if (!bill) return ApiErrors.notFound("Bill");

    let paymentId: string;

    if (parsed.data.createPayment !== false) {
      const result = await createPayment({
        memberId: bill.memberId,
        gymId,
        amount: parsed.data.amount,
        paymentMethod: parsed.data.paymentMethod,
        paymentDate: new Date(),
        planId: parsed.data.planId || "monthly",
        userId: session.user.id,
        recordOnly: true,
        notes: parsed.data.note,
      });
      paymentId = result.payment.id;
    } else {
      return ApiErrors.validationError("Payment record required for allocation");
    }

    const updated = await prisma.$transaction(async (tx) =>
      allocatePaymentToBill(
        {
          gymId,
          billId,
          paymentId,
          amount: parsed.data.amount,
          paymentMethod: parsed.data.paymentMethod,
          userId: session.user.id,
          note: parsed.data.note,
        },
        tx
      )
    );

    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
