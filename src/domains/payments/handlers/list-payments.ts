import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseQueryParams } from "@/domains/kernel";
import { getGymContext, GymContextError } from "@/domains/tenancy";
import type { IPaymentListQueries } from "../interfaces";
import type { PaymentListResultDTO, PaymentMethodValue, PaymentStatusValue } from "../types";
import { ApiErrors } from "@/lib/api-handler";

const paymentStatusSchema = z
  .enum(["PENDING", "COMPLETED", "FAILED", "REFUNDED"])
  .optional()
  .transform((v) => v as PaymentStatusValue | undefined);

const paymentMethodSchema = z
  .enum(["UPI", "CASH", "MIXED", "CARD", "BANK_TRANSFER", "OTHER"])
  .optional()
  .transform((v) => v as PaymentMethodValue | undefined);

export async function listPaymentsHandler(
  req: NextRequest,
  paymentListQueries: IPaymentListQueries
): Promise<NextResponse<PaymentListResultDTO | { error: string }>> {
  try {
    const { gymId } = await getGymContext(req);
    const { search, limit: parsedLimit } = parseQueryParams(req, {
      defaultPage: 1,
      defaultLimit: 100,
      maxLimit: 500,
    });
    const sp = req.nextUrl.searchParams;
    const limitOverride = sp.get("limit");
    const limit = limitOverride
      ? Math.min(500, Math.max(1, parseInt(limitOverride, 10) || parsedLimit))
      : parsedLimit;

    const statusParsed = paymentStatusSchema.safeParse(sp.get("status") ?? undefined);
    if (!statusParsed.success) {
      return ApiErrors.validationError("Invalid query parameters", statusParsed.error.issues);
    }
    const methodParsed = paymentMethodSchema.safeParse(sp.get("method") ?? undefined);
    if (!methodParsed.success) {
      return ApiErrors.validationError("Invalid query parameters", methodParsed.error.issues);
    }

    const startDate = sp.get("startDate") ?? undefined;
    const endDate = sp.get("endDate") ?? undefined;
    const memberId = sp.get("memberId") ?? undefined;
    const includeStats = sp.get("includeStats") === "true";

    const result = await paymentListQueries.listPayments({
      gymId,
      search,
      status: statusParsed.data,
      method: methodParsed.data,
      startDate,
      endDate,
      memberId,
      limit,
      includeStats,
    });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
