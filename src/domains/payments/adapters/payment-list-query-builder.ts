import type { PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";
import type { ListPaymentsParams } from "../types";

export function buildPaymentListWhere(
  params: ListPaymentsParams
): Prisma.PaymentWhereInput {
  const { gymId, search, status, method, startDate, endDate, memberId } = params;
  const where: Prisma.PaymentWhereInput = { gymId };

  if (status) {
    where.status = status as PaymentStatus;
  }
  if (method) {
    where.method = method as PaymentMethod;
  }
  if (memberId) {
    where.memberId = memberId;
  }
  if (startDate || endDate) {
    where.receivedAt = {};
    if (startDate) {
      where.receivedAt.gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.receivedAt.lte = end;
    }
  }
  if (search) {
    where.OR = [
      { Member: { name: { contains: search, mode: "insensitive" } } },
      { Member: { phone: { contains: search } } },
      { reference: { contains: search, mode: "insensitive" } },
      { notes: { contains: search, mode: "insensitive" } },
    ];
  }
  return where;
}

export const paymentListSelect = {
  id: true,
  amount: true,
  method: true,
  status: true,
  reference: true,
  notes: true,
  packageDuration: true,
  isPersonalTrainer: true,
  friendsFamilyDiscount: true,
  monthlyRate: true,
  studentGymfloPlan: true,
  specialOccasion: true,
  receivedAt: true,
  createdAt: true,
  Member: {
    select: {
      id: true,
      name: true,
      phone: true,
      status: true,
    },
  },
  User: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.PaymentSelect;
