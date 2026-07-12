import {
  BillStatus,
  InvoiceTransactionType,
  PaymentMethod,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = Prisma.TransactionClient | typeof prisma;

export function computeBillTotal(bill: {
  subscriptionFee: Prisma.Decimal | number | null;
  amount: Prisma.Decimal | number | null;
  tax: Prisma.Decimal | number | null;
  discountAmount: Prisma.Decimal | number | null;
}): number {
  const base = Number(bill.subscriptionFee ?? bill.amount ?? 0);
  const tax = Number(bill.tax ?? 0);
  const discount = Number(bill.discountAmount ?? 0);
  return Math.max(base + tax - discount, 0);
}

export function deriveBillStatus(paidAmount: number, total: number, dueDate?: Date | null): BillStatus {
  if (total <= 0) return BillStatus.PAID;
  if (paidAmount <= 0) {
    if (dueDate && dueDate < new Date()) return BillStatus.OVERDUE;
    return BillStatus.ISSUED;
  }
  if (paidAmount >= total) return BillStatus.PAID;
  if (dueDate && dueDate < new Date()) return BillStatus.OVERDUE;
  return BillStatus.PARTIAL;
}

export interface AllocatePaymentInput {
  gymId: string;
  billId: string;
  paymentId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  userId: string;
  note?: string;
}

export async function allocatePaymentToBill(
  input: AllocatePaymentInput,
  db: Db = prisma
) {
  const bill = await db.bill.findFirst({
    where: { id: input.billId, gymId: input.gymId, deletedAt: null },
  });
  if (!bill) throw new Error("Bill not found");

  const total = computeBillTotal(bill);
  const paid = Number(bill.paidAmount) + input.amount;
  const due = Math.max(total - paid, 0);
  const status = deriveBillStatus(paid, total, bill.dueDate);

  await db.invoiceTransaction.create({
    data: {
      gymId: input.gymId,
      billId: input.billId,
      paymentId: input.paymentId,
      type: InvoiceTransactionType.PAYMENT,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      note: input.note,
      createdById: input.userId,
    },
  });

  await db.payment.update({
    where: { id: input.paymentId },
    data: { billId: input.billId },
  });

  return db.bill.update({
    where: { id: input.billId },
    data: { paidAmount: paid, dueAmount: due, status },
  });
}

export interface RefundBillInput {
  gymId: string;
  billId: string;
  amount: number;
  userId: string;
  note?: string;
  paymentMethod?: PaymentMethod;
}

export async function refundBillAmount(input: RefundBillInput, db: Db = prisma) {
  const bill = await db.bill.findFirst({
    where: { id: input.billId, gymId: input.gymId, deletedAt: null },
  });
  if (!bill) throw new Error("Bill not found");

  const paid = Math.max(Number(bill.paidAmount) - input.amount, 0);
  const total = computeBillTotal(bill);
  const due = Math.max(total - paid, 0);
  const status =
    input.amount >= Number(bill.paidAmount) ? BillStatus.REFUND : deriveBillStatus(paid, total, bill.dueDate);

  await db.invoiceTransaction.create({
    data: {
      gymId: input.gymId,
      billId: input.billId,
      type: InvoiceTransactionType.REFUND,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      note: input.note,
      createdById: input.userId,
    },
  });

  return db.bill.update({
    where: { id: input.billId },
    data: { paidAmount: paid, dueAmount: due, status },
  });
}
