import { prisma } from "@/lib/prisma";
import { dateFromParts, endOfDayIST, todayIST, toDateOnlyIST } from "@/lib/date-only";
import type { Payment, PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";
import { PaymentStatus as PaymentStatusEnum } from "@prisma/client";
import { checkDuplicatePayment as libCheckDuplicatePayment } from "@/lib/services/payment.service";
import type { IPaymentListQueries, IPaymentQueries } from "../interfaces";
import type {
  ListPaymentsParams,
  PaymentDTO,
  PaymentListItemDTO,
  PaymentListResultDTO,
  PaymentMethodValue,
  PaymentStatusValue,
} from "../types";
import {
  buildPaymentListWhere,
  paymentListSelect,
} from "./payment-list-query-builder";

function toPaymentDTO(p: Payment): PaymentDTO {
  const paymentDate = p.paymentDate ?? p.receivedAt;
  return {
    id: p.id,
    memberId: p.memberId,
    gymId: p.gymId,
    amount: Number(p.amount),
    paymentMethod: p.method as PaymentMethodValue,
    paymentDate,
    receivedAt: p.receivedAt,
    status: p.status as PaymentStatusValue,
    planId: p.planId ?? "",
    notes: p.notes,
    reference: p.reference,
    recordedByUserId: p.receivedById,
    createdAt: p.createdAt,
  };
}

function toListItem(
  row: Prisma.PaymentGetPayload<{ select: typeof paymentListSelect }>
): PaymentListItemDTO {
  return {
    id: row.id,
    amount: Number(row.amount),
    method: row.method as PaymentMethodValue,
    status: row.status as PaymentStatusValue,
    reference: row.reference,
    notes: row.notes,
    packageDuration: row.packageDuration,
    isPersonalTrainer: row.isPersonalTrainer,
    friendsFamilyDiscount: row.friendsFamilyDiscount,
    monthlyRate: row.monthlyRate != null ? Number(row.monthlyRate) : null,
    studentGymfloPlan: row.studentGymfloPlan,
    specialOccasion: row.specialOccasion,
    receivedAt: row.receivedAt,
    createdAt: row.createdAt,
    Member: row.Member,
    User: row.User,
  };
}

export class PrismaPaymentQueries implements IPaymentQueries, IPaymentListQueries {
  async checkDuplicatePayment(
    memberId: string,
    gymId: string,
    amount: number,
    paymentDate: Date
  ): Promise<{ isDuplicate: boolean; existingPayment?: PaymentDTO }> {
    const r = await libCheckDuplicatePayment(memberId, gymId, amount, paymentDate);
    return {
      isDuplicate: r.isDuplicate,
      existingPayment: r.existingPayment
        ? toPaymentDTO(r.existingPayment)
        : undefined,
    };
  }

  async listPayments(params: ListPaymentsParams): Promise<PaymentListResultDTO> {
    const { gymId, limit = 100, includeStats } = params;
    const where = buildPaymentListWhere(params);

    const rows = await prisma.payment.findMany({
      where,
      take: limit,
      orderBy: { receivedAt: "desc" },
      select: paymentListSelect,
    });

    const result: PaymentListResultDTO = {
      payments: rows.map(toListItem),
    };

    if (!includeStats) {
      return result;
    }

    const [stats, statusBreakdown, methodBreakdown, allCompletedPayments, totalFrom2023] =
      await Promise.all([
        prisma.payment.aggregate({
          where,
          _sum: { amount: true },
          _count: { id: true },
          _avg: { amount: true },
        }),
        prisma.payment.groupBy({
          where,
          by: ["status"],
          _sum: { amount: true },
          _count: { id: true },
        }),
        prisma.payment.groupBy({
          where,
          by: ["method"],
          _sum: { amount: true },
          _count: { id: true },
        }),
        prisma.payment.findMany({
          where: { gymId, status: PaymentStatusEnum.COMPLETED },
          select: { amount: true, receivedAt: true },
        }),
        (() => {
          const startOf2023 = dateFromParts(2023, 1, 1);
          const today = endOfDayIST(todayIST());
          return prisma.payment.aggregate({
            where: {
              gymId,
              status: PaymentStatusEnum.COMPLETED,
              receivedAt: { gte: startOf2023, lte: today },
            },
            _sum: { amount: true },
            _count: { id: true },
          });
        })(),
      ]);

    const collectionByYear: Record<string, { total: number; count: number }> = {};
    for (const payment of allCompletedPayments) {
      const year = toDateOnlyIST(payment.receivedAt).getUTCFullYear().toString();
      if (!collectionByYear[year]) {
        collectionByYear[year] = { total: 0, count: 0 };
      }
      collectionByYear[year].total += Number(payment.amount);
      collectionByYear[year].count += 1;
    }

    result.stats = {
      total: Number(stats._sum.amount ?? 0),
      count: stats._count.id,
      average: Number(stats._avg.amount ?? 0),
      statusBreakdown: statusBreakdown.map((row) => ({
        status: row.status as PaymentStatusValue,
        _sum: { amount: row._sum.amount != null ? Number(row._sum.amount) : null },
        _count: { id: row._count.id },
      })),
      methodBreakdown: methodBreakdown.map((row) => ({
        method: row.method as PaymentMethodValue,
        _sum: { amount: row._sum.amount != null ? Number(row._sum.amount) : null },
        _count: { id: row._count.id },
      })),
      collectionByYear,
      totalFrom2023: {
        total: Number(totalFrom2023._sum.amount ?? 0),
        count: totalFrom2023._count.id,
      },
    };

    return result;
  }
}
