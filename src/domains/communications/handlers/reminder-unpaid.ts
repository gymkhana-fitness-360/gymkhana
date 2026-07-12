import { NextRequest, NextResponse } from "next/server";
import { getGymContext, GymContextError } from "@/domains/tenancy";
import type { IReminderUnpaidQueries } from "../interfaces";
import type { ReminderUnpaidListResultDTO } from "../types";

export async function reminderUnpaidHandler(
  req: NextRequest,
  queries: IReminderUnpaidQueries
): Promise<NextResponse<ReminderUnpaidListResultDTO | { error: string }>> {
  try {
    const { gymId } = await getGymContext(req);
    const result = await queries.listUnpaidAfterReminders(gymId);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
