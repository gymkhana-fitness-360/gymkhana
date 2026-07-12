import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getGymContext, GymContextError } from "@/domains/tenancy";
import type { IReminderLogQueries } from "../interfaces";
import type { ReminderLogListResultDTO } from "../types";
import { ApiErrors } from "@/lib/api-handler";

const filtersSchema = z.object({
  days: z.string().optional(),
  status: z.enum(["SENT", "FAILED"]).optional(),
});

export async function reminderLogHistoryHandler(
  req: NextRequest,
  logQueries: IReminderLogQueries
): Promise<NextResponse<ReminderLogListResultDTO | { error: string }>> {
  try {
    const { gymId } = await getGymContext(req);
    const sp = req.nextUrl.searchParams;
    const parsed = filtersSchema.safeParse({
      days: sp.get("days") ?? "all",
      status: sp.get("status") ?? undefined,
    });
    if (!parsed.success) {
      return ApiErrors.validationError("Invalid query parameters", parsed.error.issues);
    }
    const result = await logQueries.listReminderLogs(gymId, parsed.data);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
