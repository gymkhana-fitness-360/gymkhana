import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PaymentMethod, ProgramType } from "@prisma/client";
import { getGymContext, GymContextError } from "@/domains/tenancy";
import { prisma } from "@/lib/prisma";
import { ApiErrors } from "@/lib/api-handler";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { WORKOUT_PLANS } from "../constants";
import { auth } from "@/lib/auth";
import { generateNextBillNumber } from "@/lib/gym-settings/code-sequences";
import { applyChargePolicy, getChargePolicy } from "@/lib/gym-settings/charge-policy";
import { deriveBillStatus } from "@/lib/billing/invoice-ledger";

const createBillSchema = z.object({
  memberId: z.string().min(1),
  programType: z.nativeEnum(ProgramType),
  paymentMethod: z.nativeEnum(PaymentMethod),
  amount: z.number().optional(),
  subscriptionFee: z.number().optional(),
  tax: z.number().optional(),
  discountAmount: z.number().optional(),
  discountNote: z.string().max(500).optional(),
  dueDate: z.string().optional(),
  month: z.string().min(1),
  validFrom: z.string().min(1),
  validTo: z.string().min(1),
  nextPaymentDate: z.string().optional(),
  hideAmount: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
  membershipId: z.string().optional(),
});

export async function createBillHandler(req: NextRequest): Promise<NextResponse> {
  try {
    const { gymId } = await getGymContext(req);
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    const parsed = await parseJsonBody(req, createBillSchema);
    if (!parsed.ok) return parsed.response;

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) return ApiErrors.notFound("User");

    const member = await prisma.member.findFirst({
      where: { id: parsed.data.memberId, gymId, deletedAt: null },
    });
    if (!member) return ApiErrors.notFound("Member");

    const workoutPlan =
      WORKOUT_PLANS[parsed.data.programType as keyof typeof WORKOUT_PLANS];
    const billNumber = await generateNextBillNumber(gymId);
    const policy = await getChargePolicy(gymId);

    const subtotal = parsed.data.subscriptionFee ?? parsed.data.amount ?? 0;
    const breakdown = applyChargePolicy(
      subtotal,
      policy,
      parsed.data.discountAmount ?? 0
    );
    const tax = parsed.data.tax ?? breakdown.tax;
    const total = subtotal + Number(tax) - (parsed.data.discountAmount ?? breakdown.discount);
    const dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;

    const bill = await prisma.bill.create({
      data: {
        billNumber,
        memberId: parsed.data.memberId,
        gymId,
        programType: parsed.data.programType,
        paymentMethod: parsed.data.paymentMethod,
        amount: parsed.data.hideAmount ? null : total,
        subscriptionFee: subtotal,
        tax,
        discountAmount: parsed.data.discountAmount ?? breakdown.discount,
        discountNote: parsed.data.discountNote,
        paidAmount: 0,
        dueAmount: total,
        status: deriveBillStatus(0, total, dueDate),
        dueDate,
        membershipId: parsed.data.membershipId,
        month: parsed.data.month,
        validFrom: new Date(parsed.data.validFrom),
        validTo: new Date(parsed.data.validTo),
        nextPaymentDate: parsed.data.nextPaymentDate
          ? new Date(parsed.data.nextPaymentDate)
          : null,
        hideAmount: parsed.data.hideAmount ?? false,
        workoutPlan: JSON.stringify(workoutPlan),
        notes: parsed.data.notes,
        generatedById: user.id,
      },
      include: { Member: true, User: true },
    });

    return NextResponse.json(bill, { status: 201 });
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
