import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";
import { parseJsonBody } from "@/lib/security/parse-json-body";

const mutatingBodySchema = z.object({
  employeeId: z.string().optional(),
  amount: z.union([z.string(), z.number()]).optional(),
  paymentDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date").optional(),
  method: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
}).passthrough();
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";
import { resourceBelongsToGym } from "@/domains/tenancy";
import { PaymentMethod } from "@prisma/client";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { createLogger } from "@/lib/logger";
import { ApiErrors, validateEnumParam } from "@/lib/api-handler";

const logger = createLogger("api-salaries");

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session) {
      return ApiErrors.unauthorized();
    }

    if (session.user.role !== "ADMIN") {
      return ApiErrors.forbidden("Admin access required");
    }

    const gymId = await resolveGymIdForUser(
      session.user.id,
      readRequestedGymIdFromRequest(request),
    );
    if (!gymId) {
      return ApiErrors.badRequest("No gym selected");
    }

    const { id } = await params;

    const existing = await prisma.salary.findUnique({
      where: { id },
      select: { id: true, gymId: true },
    });
    if (!resourceBelongsToGym(existing, gymId)) {
      return ApiErrors.notFound("Salary record");
    }

    const parsedBody = await parseJsonBody(request, mutatingBodySchema);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.data as any;
    const {
      employeeId,
      amount,
      paymentDate,
      method,
      reference,
      notes,
    } = body;

    if (!employeeId || !amount || !paymentDate || !method) {
      return ApiErrors.validationError("Missing required fields");
    }

    // Validate enum
    const methodValidation = validateEnumParam(method, PaymentMethod, "method");
    if (methodValidation.error) return methodValidation.error;

    const paymentDateObj = new Date(paymentDate);
    const month = paymentDateObj.getMonth() + 1;
    const year = paymentDateObj.getFullYear();

    const salary = await prisma.salary.update({
      where: { id },
      data: {
        employeeId,
        amount: parseFloat(amount),
        paymentDate: paymentDateObj,
        month,
        year,
        method: methodValidation.value!,
        reference: reference || null,
        notes: notes || null,
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

    return NextResponse.json(salary);
  } catch (error) {
    logger.error("Error updating salary:", error as Error);
    return ApiErrors.internal("Failed to update salary");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session) {
      return ApiErrors.unauthorized();
    }

    if (session.user.role !== "ADMIN") {
      return ApiErrors.forbidden("Admin access required");
    }

    const gymId = await resolveGymIdForUser(
      session.user.id,
      readRequestedGymIdFromRequest(request),
    );
    if (!gymId) {
      return ApiErrors.badRequest("No gym selected");
    }

    const { id } = await params;

    const salary = await prisma.salary.findUnique({
      where: { id },
      select: { id: true, gymId: true },
    });

    if (!resourceBelongsToGym(salary, gymId)) {
      return ApiErrors.notFound("Salary record");
    }

    await prisma.salary.delete({
      where: { id },
    });

    logger.info(`Salary deleted: ${id}`);

    return NextResponse.json({ success: true, message: "Salary deleted successfully" });
  } catch (error) {
    logger.error("Error deleting salary:", error as Error);
    return ApiErrors.internal("Failed to delete salary");
  }
}
