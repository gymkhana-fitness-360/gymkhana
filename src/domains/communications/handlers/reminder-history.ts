import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getGymContext, GymContextError } from "@/domains/tenancy";
import type { IReminderListQueries } from "../interfaces";
import type { ReminderListFiltersDTO, ReminderListItemDTO } from "../types";
import { ApiErrors } from "@/lib/api-handler";

const filtersSchema = z.object({
  status: z.string().max(32).optional(),
  type: z.string().max(32).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

export async function reminderHistoryHandler(
  req: NextRequest,
  reminderQueries: IReminderListQueries
): Promise<NextResponse<ReminderListItemDTO[] | { error: string }>> {
  try {
    const { gymId } = await getGymContext(req);
    const sp = req.nextUrl.searchParams;
    const raw = {
      status: sp.get("status") ?? undefined,
      type: sp.get("type") ?? undefined,
      limit: sp.get("limit") ?? undefined,
    };
    const parsed = filtersSchema.safeParse(raw);
    if (!parsed.success) {
      return ApiErrors.validationError("Invalid query parameters", parsed.error.issues);
    }
    const filters: ReminderListFiltersDTO = {
      status: parsed.data.status,
      type: parsed.data.type,
      limit: parsed.data.limit ?? 100,
    };
    const rows = await reminderQueries.listReminders(gymId, filters);
    return NextResponse.json(rows);
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
