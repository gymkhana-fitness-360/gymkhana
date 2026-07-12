import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ExpenseCategory, ExpenseStatus, ExpenseType, PaymentMethod } from "@prisma/client";
import { auth } from "@/lib/auth";
import { parseJsonBody } from "@/lib/security/parse-json-body";
import { ApiErrors, validateEnumParam } from "@/lib/api-handler";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";
import { createExpense } from "../adapters/prisma-expense-queries";

const createExpenseBodySchema = z
  .object({
    description: z.string().optional(),
    category: z.string().optional(),
    type: z.string().optional(),
    amount: z.union([z.string(), z.number()]).optional(),
    paymentDate: z
      .string()
      .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date")
      .optional(),
    method: z.string().optional(),
    vendor: z.string().optional(),
    reference: z.string().optional(),
    notes: z.string().optional(),
    nextDueDate: z
      .string()
      .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date")
      .optional(),
    status: z.enum(["PENDING", "PAID", "OVERDUE"]).optional(),
    dueDate: z
      .string()
      .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date")
      .optional(),
  })
  .passthrough();

export async function createExpenseHandler(request: NextRequest) {
  const session = await auth();
  if (!session) return ApiErrors.unauthorized();

  const gymId = await resolveGymIdForUser(
    session.user.id,
    readRequestedGymIdFromRequest(request),
  );
  if (!gymId) {
    return ApiErrors.badRequest("No gym selected or account has no locations.");
  }

  const parsedBody = await parseJsonBody(request, createExpenseBodySchema);
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.data;

  const { description, category, type, amount, paymentDate, method, vendor, reference, notes, nextDueDate, status: bodyStatus, dueDate } = body;

  if (!description || !category || amount == null || !method) {
    return ApiErrors.validationError("Missing required fields", {
      missing: {
        description: !description,
        category: !category,
        amount: amount == null,
        method: !method,
      },
    });
  }

  const amountNum = parseFloat(String(amount));
  if (Number.isNaN(amountNum) || amountNum <= 0) {
    return ApiErrors.validationError("Invalid amount. Must be a positive number.");
  }

  const paymentDateObj = paymentDate ? new Date(paymentDate) : new Date();
  if (Number.isNaN(paymentDateObj.getTime())) {
    return ApiErrors.validationError("Invalid payment date.");
  }

  const categoryValidation = validateEnumParam(category, ExpenseCategory, "category");
  if (categoryValidation.error) return categoryValidation.error;

  const methodValidation = validateEnumParam(method, PaymentMethod, "method");
  if (methodValidation.error) return methodValidation.error;

  const resolvedStatus = (bodyStatus as ExpenseStatus) || ExpenseStatus.PAID;

  const expense = await createExpense({
    gymId,
    recordedById: session.user.id,
    description,
    category: categoryValidation.value!,
    type: (type as ExpenseType) || ExpenseType.ONE_TIME,
    amount: amountNum,
    paymentDate: paymentDateObj,
    status: resolvedStatus,
    dueDate: dueDate ? new Date(dueDate) : null,
    method: methodValidation.value!,
    vendor: vendor ? vendor.trim() : null,
    reference: reference ? reference.trim() : null,
    notes: notes ? notes.trim() : null,
    nextDueDate: nextDueDate ? new Date(nextDueDate) : null,
  });

  return NextResponse.json(expense, { status: 201 });
}
