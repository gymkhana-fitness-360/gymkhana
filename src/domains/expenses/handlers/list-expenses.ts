import { NextRequest, NextResponse } from "next/server";
import { ExpenseCategory, ExpenseStatus, ExpenseType, PaymentMethod } from "@prisma/client";
import { auth } from "@/lib/auth";
import { cachedJson } from "@/lib/api-cache";
import { ApiErrors, validateEnumParam } from "@/lib/api-handler";
import {
  readRequestedGymIdFromRequest,
  resolveGymIdForUser,
} from "@/lib/gym-scope";
import { listExpensesWithStats } from "../adapters/prisma-expense-queries";

export async function listExpensesHandler(request: NextRequest) {
  const session = await auth();
  if (!session) return ApiErrors.unauthorized();

  const gymId = await resolveGymIdForUser(
    session.user.id,
    readRequestedGymIdFromRequest(request),
  );
  if (!gymId) {
    return ApiErrors.badRequest("No gym selected or account has no locations.");
  }

  const searchParams = request.nextUrl.searchParams;
  const categoryValidation = validateEnumParam(
    searchParams.get("category"),
    ExpenseCategory,
    "category",
  );
  if (categoryValidation.error) return categoryValidation.error;

  const typeValidation = validateEnumParam(searchParams.get("type"), ExpenseType, "type");
  if (typeValidation.error) return typeValidation.error;

  const statusValidation = validateEnumParam(
    searchParams.get("status"),
    ExpenseStatus,
    "status",
  );
  if (statusValidation.error) return statusValidation.error;

  const limit = parseInt(searchParams.get("limit") || "100", 10) || 100;

  const result = await listExpensesWithStats({
    gymId,
    category: categoryValidation.value,
    type: typeValidation.value,
    status: statusValidation.value,
    startDate: searchParams.get("startDate"),
    endDate: searchParams.get("endDate"),
    search: searchParams.get("search"),
    limit,
  });

  return cachedJson(result);
}
