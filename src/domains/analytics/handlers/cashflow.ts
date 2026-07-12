import { NextRequest, NextResponse } from "next/server";
import { getGymContext, GymContextError } from "@/domains/tenancy";
import { ApiErrors } from "@/lib/api-handler";
import { cachedJson } from "@/lib/api-cache";
import { prisma } from "@/lib/prisma";
import { PaymentStatus } from "@prisma/client";

export interface CashflowSummary {
  period: { startDate: string; endDate: string };
  collected: number;
  expenses: number;
  salaries: number;
  net: number;
  outstanding: number;
}

export async function cashflowHandler(req: NextRequest): Promise<NextResponse> {
  try {
    const { gymId } = await getGymContext(req);
    const startParam = req.nextUrl.searchParams.get("startDate");
    const endParam = req.nextUrl.searchParams.get("endDate");

    const endDate = endParam ? new Date(endParam) : new Date();
    const startDate = startParam
      ? new Date(startParam)
      : new Date(endDate.getFullYear(), endDate.getMonth(), 1);

    endDate.setHours(23, 59, 59, 999);

    const paymentWhere = {
      gymId,
      status: PaymentStatus.COMPLETED,
      receivedAt: { gte: startDate, lte: endDate },
    };

    const [payments, expenses, salaries, outstanding] = await Promise.all([
      prisma.payment.aggregate({
        where: paymentWhere,
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: {
          gymId,
          OR: [
            { paidAt: { gte: startDate, lte: endDate } },
            { paidAt: null, paymentDate: { gte: startDate, lte: endDate } },
          ],
        },
        _sum: { amount: true },
      }),
      prisma.salary.aggregate({
        where: {
          gymId,
          paymentDate: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
      }),
      prisma.bill.aggregate({
        where: { gymId, deletedAt: null, dueAmount: { gt: 0 } },
        _sum: { dueAmount: true },
      }),
    ]);

    const collected = Number(payments._sum.amount ?? 0);
    const expenseTotal = Number(expenses._sum.amount ?? 0);
    const salaryTotal = Number(salaries._sum.amount ?? 0);
    const outstandingTotal = Number(outstanding._sum.dueAmount ?? 0);

    const summary: CashflowSummary = {
      period: {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      },
      collected,
      expenses: expenseTotal,
      salaries: salaryTotal,
      net: collected - expenseTotal - salaryTotal,
      outstanding: outstandingTotal,
    };

    return cachedJson(summary);
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
