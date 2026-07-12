import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getGymContext, GymContextError } from "@/domains/tenancy";
import type { IQuickEntryService } from "../interfaces";
import type { QuickEntryBatchResultDTO, QuickEntryInputDTO } from "../types";
import { ApiErrors } from "@/lib/api-handler";

const quickEntryBodySchema = z.object({
  lines: z
    .array(
      z.object({
        rawText: z.string().min(1),
      })
    )
    .min(1),
});

export async function quickEntryHandler(
  req: NextRequest,
  quickEntryService: IQuickEntryService
): Promise<NextResponse<QuickEntryBatchResultDTO | { error: string }>> {
  try {
    const { gymId, userId } = await getGymContext(req);
    const json = await req.json().catch(() => null);
    const parsed = quickEntryBodySchema.safeParse(json);
    if (!parsed.success) {
      return ApiErrors.validationError("Validation failed", parsed.error.issues);
    }
    const input: QuickEntryInputDTO = { lines: parsed.data.lines };
    const result = await quickEntryService.processBatch(input, gymId, userId);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
