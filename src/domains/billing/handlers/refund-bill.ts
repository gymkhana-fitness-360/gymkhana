import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PaymentMethod } from "@prisma/client";
import { getGymContext, GymContextError } from "@/domains/tenancy";
import { ApiErrors } from "@/lib/api-handler";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { auth } from "@/lib/auth";
import { refundBillAmount } from "@/lib/billing/invoice-ledger";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  amount: z.number().positive(),
  note: z.string().max(500).optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
});

export async function refundBillHandler(
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

    const updated = await refundBillAmount({
      gymId,
      billId,
      amount: parsed.data.amount,
      userId: session.user.id,
      note: parsed.data.note,
      paymentMethod: parsed.data.paymentMethod,
    });

    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
