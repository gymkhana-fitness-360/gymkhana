import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getGymContext, GymContextError } from "@/domains/tenancy";
import type { IPaymentService } from "../interfaces";
import type {
  CreatePaymentInputDTO,
  PaymentMethodValue,
  PaymentOperationResultDTO,
  PaymentStatusValue,
} from "../types";
import { ApiErrors } from "@/lib/api-handler";
import { publishDomainEvent } from "@/lib/platform/outbox";

const paymentMethodEnum = z.enum([
  "UPI",
  "CASH",
  "MIXED",
  "CARD",
  "BANK_TRANSFER",
  "OTHER",
]);

const paymentStatusEnum = z.enum(["PENDING", "COMPLETED", "FAILED", "REFUNDED"]).optional();

const createPaymentBodySchema = z.object({
  memberId: z.string().min(1),
  amount: z.coerce.number().positive(),
  paymentMethod: paymentMethodEnum.transform((v) => v as PaymentMethodValue),
  paymentDate: z.coerce.date(),
  planId: z.string().min(1),
  duration: z.string().max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  reference: z.string().max(200).optional().nullable(),
  recordOnly: z.boolean().optional(),
  packageDuration: z.string().max(100).optional().nullable(),
  isPersonalTrainer: z.boolean().optional(),
  friendsFamilyDiscount: z.boolean().optional(),
  monthlyRate: z.number().positive().optional().nullable(),
  studentGymfloPlan: z.boolean().optional(),
  specialOccasion: z.string().max(200).optional().nullable(),
  status: paymentStatusEnum.transform((v) => v as PaymentStatusValue | undefined),
});

export async function createPaymentHandler(
  req: NextRequest,
  paymentService: IPaymentService
): Promise<NextResponse<PaymentOperationResultDTO | { error: string }>> {
  try {
    const { gymId, userId } = await getGymContext(req);
    const json = await req.json().catch(() => null);
    const parsed = createPaymentBodySchema.safeParse(json);
    if (!parsed.success) {
      return ApiErrors.validationError("Validation failed", parsed.error.issues);
    }
    const d = parsed.data;
    const input: CreatePaymentInputDTO = {
      memberId: d.memberId,
      gymId,
      amount: d.amount,
      paymentMethod: d.paymentMethod,
      paymentDate: d.paymentDate,
      planId: d.planId,
      userId,
      duration: d.duration ?? null,
      notes: d.notes ?? undefined,
      reference: d.reference ?? null,
      recordOnly: d.recordOnly,
      packageDuration: d.packageDuration ?? null,
      isPersonalTrainer: d.isPersonalTrainer,
      friendsFamilyDiscount: d.friendsFamilyDiscount,
      monthlyRate: d.monthlyRate ?? null,
      studentGymfloPlan: d.studentGymfloPlan,
      specialOccasion: d.specialOccasion ?? null,
      status: d.status,
    };
    const result = await paymentService.createPayment(input);
    if (result.payment?.id) {
      await publishDomainEvent(
        "payment.recorded",
        {
          paymentId: result.payment.id,
          memberId: d.memberId,
          amount: d.amount,
        },
        gymId,
      );
    }
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
