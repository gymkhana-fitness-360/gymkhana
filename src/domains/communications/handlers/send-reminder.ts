import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getGymContext, GymContextError } from "@/domains/tenancy";
import type { IManualReminderCommands } from "../interfaces";
import type { CreateManualReminderInputDTO, ReminderDTO } from "../types";
import { ApiErrors } from "@/lib/api-handler";

const bodySchema = z.object({
  memberId: z.string().min(1),
  type: z.string().min(1).max(64),
  message: z.string().min(1).max(4000),
  scheduledFor: z.string().min(1),
});

export async function sendReminderHandler(
  req: NextRequest,
  reminders: IManualReminderCommands
): Promise<NextResponse<ReminderDTO | { error: string }>> {
  try {
    const { gymId } = await getGymContext(req);
    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return ApiErrors.validationError("Validation failed", parsed.error.issues);
    }
    const input: CreateManualReminderInputDTO = parsed.data;
    const reminder = await reminders.createReminder(gymId, input);
    return NextResponse.json(reminder, { status: 201 });
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
