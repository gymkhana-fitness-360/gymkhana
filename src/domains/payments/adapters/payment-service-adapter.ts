import type { Payment } from "@prisma/client";
import {
  checkDuplicatePayment as libCheckDuplicatePayment,
  createBulkPayments as libCreateBulkPayments,
  createPayment as libCreatePayment,
  deleteDuplicatePayment as libDeleteDuplicatePayment,
} from "@/lib/services/payment.service";
import type { CreatePaymentInput } from "@/lib/services/payment.service";
import type { IPaymentService } from "../interfaces";
import type {
  CreatePaymentInputDTO,
  PaymentDTO,
  PaymentOperationResultDTO,
} from "../types";
import { PrismaPaymentQueries } from "./prisma-payment-queries";

function toPaymentDTO(p: Payment): PaymentDTO {
  const paymentDate = p.paymentDate ?? p.receivedAt;
  return {
    id: p.id,
    memberId: p.memberId,
    gymId: p.gymId,
    amount: Number(p.amount),
    paymentMethod: p.method as PaymentDTO["paymentMethod"],
    paymentDate,
    receivedAt: p.receivedAt,
    status: p.status as PaymentDTO["status"],
    planId: p.planId ?? "",
    notes: p.notes,
    reference: p.reference,
    recordedByUserId: p.receivedById,
    createdAt: p.createdAt,
  };
}

function toLibInput(input: CreatePaymentInputDTO): CreatePaymentInput {
  return {
    memberId: input.memberId,
    gymId: input.gymId,
    amount: input.amount,
    paymentMethod: input.paymentMethod as CreatePaymentInput["paymentMethod"],
    paymentDate: input.paymentDate,
    planId: input.planId,
    duration: input.duration,
    userId: input.userId,
    notes: input.notes,
    recordOnly: input.recordOnly,
    reference: input.reference,
    status: input.status as CreatePaymentInput["status"],
    packageDuration: input.packageDuration,
    isPersonalTrainer: input.isPersonalTrainer,
    friendsFamilyDiscount: input.friendsFamilyDiscount,
    monthlyRate: input.monthlyRate ?? undefined,
    studentGymfloPlan: input.studentGymfloPlan,
    specialOccasion: input.specialOccasion,
  };
}

function toOperationResult(r: {
  payment: Payment;
  membership: { id: string } | null;
  wasExtended: boolean;
  isDuplicate: boolean;
}): PaymentOperationResultDTO {
  return {
    payment: toPaymentDTO(r.payment),
    membershipId: r.membership?.id ?? null,
    wasExtended: r.wasExtended,
    isDuplicate: r.isDuplicate,
  };
}

export class PaymentServiceAdapter implements IPaymentService {
  constructor(private readonly queries = new PrismaPaymentQueries()) {}

  checkDuplicatePayment(
    memberId: string,
    gymId: string,
    amount: number,
    paymentDate: Date
  ) {
    return this.queries.checkDuplicatePayment(memberId, gymId, amount, paymentDate);
  }

  async createPayment(
    input: CreatePaymentInputDTO
  ): Promise<PaymentOperationResultDTO> {
    const r = await libCreatePayment(toLibInput(input));
    return toOperationResult(r);
  }

  async createBulkPayments(
    inputs: CreatePaymentInputDTO[]
  ): Promise<PaymentOperationResultDTO[]> {
    const results = await libCreateBulkPayments(inputs.map(toLibInput));
    return results.map((r) => toOperationResult(r));
  }

  deleteDuplicatePayment(
    paymentId: string,
    userId: string,
    reason: string
  ): Promise<void> {
    return libDeleteDuplicatePayment(paymentId, userId, reason);
  }
}
