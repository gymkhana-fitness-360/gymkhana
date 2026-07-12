import {
  ExpenseCategory,
  ExpenseStatus,
  ExpenseType,
  PaymentMethod,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ListExpensesFilters = {
  gymId: string;
  category?: ExpenseCategory | null;
  type?: ExpenseType | null;
  status?: ExpenseStatus | null;
  startDate?: string | null;
  endDate?: string | null;
  search?: string | null;
  limit: number;
};

function buildWhere(filters: ListExpensesFilters): Prisma.ExpenseWhereInput {
  const where: Prisma.ExpenseWhereInput = { gymId: filters.gymId };

  if (filters.category) where.category = filters.category;
  if (filters.type) where.type = filters.type;
  if (filters.status) where.status = filters.status;

  if (filters.startDate || filters.endDate) {
    where.paymentDate = {};
    if (filters.startDate) where.paymentDate.gte = new Date(filters.startDate);
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      where.paymentDate.lte = end;
    }
  }

  if (filters.search) {
    where.OR = [
      { description: { contains: filters.search, mode: "insensitive" } },
      { vendor: { contains: filters.search, mode: "insensitive" } },
      { reference: { contains: filters.search, mode: "insensitive" } },
      { notes: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  return where;
}

export async function listExpensesWithStats(filters: ListExpensesFilters) {
  const where = buildWhere(filters);

  const [expenses, stats, categoryBreakdown, typeBreakdown] = await Promise.all([
    prisma.expense.findMany({
      where,
      take: filters.limit,
      orderBy: { paymentDate: "desc" },
      include: { User: { select: { id: true, name: true } } },
    }),
    prisma.expense.aggregate({
      where,
      _sum: { amount: true },
      _count: { id: true },
      _avg: { amount: true },
    }),
    prisma.expense.groupBy({
      where,
      by: ["category"],
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.expense.groupBy({
      where,
      by: ["type"],
      _sum: { amount: true },
      _count: { id: true },
    }),
  ]);

  return {
    expenses,
    stats: {
      total: stats._sum.amount || 0,
      count: stats._count.id || 0,
      average: stats._avg.amount || 0,
      categoryBreakdown,
      typeBreakdown,
    },
  };
}

export type CreateExpenseInput = {
  gymId: string;
  recordedById: string;
  description: string;
  category: ExpenseCategory;
  type: ExpenseType;
  amount: number;
  paymentDate: Date;
  status: ExpenseStatus;
  dueDate: Date | null;
  method: PaymentMethod;
  vendor: string | null;
  reference: string | null;
  notes: string | null;
  nextDueDate: Date | null;
};

export async function createExpense(input: CreateExpenseInput) {
  return prisma.expense.create({
    data: {
      gymId: input.gymId,
      description: input.description.trim(),
      category: input.category,
      type: input.type,
      amount: input.amount,
      paymentDate: input.paymentDate,
      status: input.status,
      dueDate: input.dueDate,
      paidAt: input.status === ExpenseStatus.PAID ? input.paymentDate : null,
      method: input.method,
      vendor: input.vendor,
      reference: input.reference,
      notes: input.notes,
      nextDueDate: input.nextDueDate,
      recordedById: input.recordedById,
    },
    include: { User: { select: { id: true, name: true } } },
  });
}
