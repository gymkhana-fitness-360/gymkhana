import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PaymentMethod, Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { cachedJson } from "@/lib/api-cache";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import { ApiErrors, validateEnumParam } from "@/lib/api-handler";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";
import { parseJsonBody } from "@/lib/security/parse-json-body";

const logger = createLogger("api-salaries");

const mutatingBodySchema = z
  .object({
    employeeId: z.string().optional(),
    amount: z.union([z.string(), z.number()]).optional(),
    paymentDate: z
      .string()
      .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date")
      .optional(),
    method: z.string().optional(),
    reference: z.string().optional(),
    notes: z.string().optional(),
  })
  .passthrough();

export async function listSalariesHandler(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return ApiErrors.unauthorized();
    }

    const gymId = await resolveGymIdForUser(
      session.user.id,
      readRequestedGymIdFromRequest(request),
    );
    if (!gymId) {
      return ApiErrors.validationError("No gym selected or account has no locations.");
    }

    const searchParams = request.nextUrl.searchParams;
    const employeeId = searchParams.get("employeeId");
    const year = searchParams.get("year");
    const month = searchParams.get("month");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "100", 10) || 100;

    const where: Prisma.SalaryWhereInput = { gymId };

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (year) {
      const y = parseInt(year, 10);
      if (!Number.isNaN(y)) {
        where.year = y;
      }
    }

    if (month) {
      const m = parseInt(month, 10);
      if (!Number.isNaN(m)) {
        where.month = m;
      }
    }

    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) {
        where.paymentDate.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.paymentDate.lte = end;
      }
    }

    const salaries = await prisma.salary.findMany({
      where,
      take: limit,
      orderBy: {
        paymentDate: "desc",
      },
      include: {
        User_Salary_employeeIdToUser: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        User_Salary_paidByIdToUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const stats = await prisma.salary.aggregate({
      where,
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
      _avg: {
        amount: true,
      },
    });

    const employeeBreakdown = await prisma.salary.groupBy({
      where,
      by: ["employeeId"],
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    const monthBreakdown = await prisma.salary.groupBy({
      where,
      by: ["year", "month"],
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    return cachedJson({
      salaries,
      stats: {
        total: stats._sum.amount || 0,
        count: stats._count.id || 0,
        average: stats._avg.amount || 0,
        employeeBreakdown,
        monthBreakdown,
      },
    });
  } catch (error) {
    logger.error("Error fetching salaries:", error as Error);
    return ApiErrors.internal("Failed to fetch salaries");
  }
}

export async function createSalaryHandler(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return ApiErrors.unauthorized();
    }

    const gymId = await resolveGymIdForUser(
      session.user.id,
      readRequestedGymIdFromRequest(request),
    );
    if (!gymId) {
      return ApiErrors.badRequest("No gym selected or account has no locations.");
    }

    const parsedBody = await parseJsonBody(request, mutatingBodySchema);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.data as {
      employeeId?: string;
      amount?: string | number;
      paymentDate?: string;
      method?: string;
      reference?: string;
      notes?: string;
    };
    const { employeeId, amount, paymentDate, method, reference, notes } = body;

    if (!employeeId || !amount || !paymentDate || !method) {
      return ApiErrors.validationError("Missing required fields");
    }

    const methodValidation = validateEnumParam(method, PaymentMethod, "method");
    if (methodValidation.error) return methodValidation.error;

    const paymentDateObj = new Date(paymentDate);
    const month = paymentDateObj.getMonth() + 1;
    const year = paymentDateObj.getFullYear();

    const salary = await prisma.salary.create({
      data: {
        gymId,
        employeeId,
        amount: parseFloat(String(amount)),
        paymentDate: paymentDateObj,
        month,
        year,
        method: methodValidation.value!,
        reference: reference || null,
        notes: notes || null,
        paidById: session.user.id,
      },
      include: {
        User_Salary_employeeIdToUser: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        User_Salary_paidByIdToUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(salary, { status: 201 });
  } catch (error) {
    logger.error("Error creating salary:", error as Error);
    return ApiErrors.internal("Failed to create salary");
  }
}
