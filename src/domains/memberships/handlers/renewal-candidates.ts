import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getGymContext, GymContextError } from "@/domains/tenancy";
import type { IRenewalReminderQueries } from "../interfaces";
import type { RenewalCandidatesResultDTO } from "../types";
import { ApiErrors } from "@/lib/api-handler";

const fromDateSchema = z
  .string()
  .min(1)
  .optional()
  .refine((s) => !s || !Number.isNaN(Date.parse(s)), "Invalid fromDate");

export async function renewalCandidatesHandler(
  req: NextRequest,
  renewalQueries: IRenewalReminderQueries
): Promise<NextResponse<RenewalCandidatesResultDTO | { error: string }>> {
  try {
    const { gymId } = await getGymContext(req);
    const sp = req.nextUrl.searchParams;
    const fromDateRaw = sp.get("fromDate") ?? undefined;
    const fromDateParsed = fromDateSchema.safeParse(fromDateRaw);
    if (!fromDateParsed.success) {
      return ApiErrors.validationError("Invalid query parameters", fromDateParsed.error.issues);
    }
    const lookbackRaw = sp.get("lookback");
    const lookbackDays = lookbackRaw
      ? Math.min(365, Math.max(1, parseInt(lookbackRaw, 10) || 30))
      : undefined;
    const fromDate = fromDateParsed.data ? new Date(fromDateParsed.data) : undefined;
    const result = await renewalQueries.listReminderCandidates(gymId, {
      lookbackDays,
      fromDate,
    });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
