import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";
import { parseJsonBody } from "@/lib/security/parse-json-body";

const mutatingBodySchema = z.object({
  description: z.string().optional(),
  category: z.string().optional(),
  type: z.string().optional(),
  amount: z.union([z.string(), z.number()]).optional(),
  paymentDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date").optional(),
  method: z.string().optional(),
  vendor: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  nextDueDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date").optional(),
}).passthrough();
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";
import { resourceBelongsToGym } from "@/domains/tenancy";
import { PaymentMethod, ExpenseCategory, ExpenseType } from "@prisma/client";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { createLogger } from "@/lib/logger";
import { ApiErrors, validateEnumParam } from "@/lib/api-handler";

const logger = createLogger("api-expenses");

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    // Only admins can update expenses
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

    const existing = await prisma.expense.findUnique({
      where: { id },
      select: { id: true, gymId: true },
    });
    if (!resourceBelongsToGym(existing, gymId)) {
      return ApiErrors.notFound("Expense record");
    }

    const parsedBody = await parseJsonBody(request, mutatingBodySchema);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.data as any;
    const {
      description,
      category,
      type,
      amount,
      paymentDate,
      method,
      vendor,
      reference,
      notes,
      nextDueDate,
    } = body;

    if (!description || !category || !amount || !paymentDate || !method) {
      return ApiErrors.validationError("Missing required fields");
    }

    // Validate enums
    const categoryValidation = validateEnumParam(category, ExpenseCategory, "category");
    if (categoryValidation.error) return categoryValidation.error;

    const methodValidation = validateEnumParam(method, PaymentMethod, "method");
    if (methodValidation.error) return methodValidation.error;

    const typeValidation = validateEnumParam(type || "ONE_TIME", ExpenseType, "type");
    if (typeValidation.error) return typeValidation.error;

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        description,
        category: categoryValidation.value!,
        type: typeValidation.value || ExpenseType.ONE_TIME,
        amount: parseFloat(amount),
        paymentDate: new Date(paymentDate),
        method: methodValidation.value!,
        vendor: vendor || null,
        reference: reference || null,
        notes: notes || null,
        nextDueDate: nextDueDate ? new Date(nextDueDate) : null,
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(expense);
  } catch (error) {
    logger.error("Error updating expense:", error as Error);
    return ApiErrors.internal("Failed to update expense");
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

    const expense = await prisma.expense.findUnique({
      where: { id },
      select: { id: true, gymId: true },
    });

    if (!resourceBelongsToGym(expense, gymId)) {
      return ApiErrors.notFound("Expense record");
    }

    await prisma.expense.delete({
      where: { id },
    });

    logger.info(`Expense deleted: ${id}`);

    return NextResponse.json({ success: true, message: "Expense deleted successfully" });
  } catch (error) {
    logger.error("Error deleting expense:", error as Error);
    return ApiErrors.internal("Failed to delete expense");
  }
}
