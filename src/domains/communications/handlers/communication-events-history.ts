import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getGymContext, GymContextError } from "@/domains/tenancy";
import { listCommunicationEvents } from "@/domains/communications/communication-ledger";
import type { ReminderLogListResultDTO } from "@/domains/communications/types";
import { ApiErrors } from "@/lib/api-handler";

const filtersSchema = z.object({
  days: z.string().optional(),
  status: z.enum(["SENT", "FAILED"]).optional(),
});

function daysToMs(days: string): number | null {
  if (days === "7") return 7 * 24 * 60 * 60 * 1000;
  if (days === "30") return 30 * 24 * 60 * 60 * 1000;
  return null;
}

export async function communicationEventsHistoryHandler(
  req: NextRequest,
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

    const events = await listCommunicationEvents(gymId, { limit: 200 });
    const cutoffMs = daysToMs(parsed.data.days ?? "all");
    const since =
      cutoffMs != null ? new Date(Date.now() - cutoffMs) : null;

    const logs = events
      .filter((e) => e.channel === "WHATSAPP")
      .filter((e) => (since ? e.createdAt >= since : true))
      .filter((e) =>
        parsed.data.status
          ? e.status === parsed.data.status
          : true,
      )
      .map((e) => ({
        id: e.id,
        gymId: e.gymId,
        memberId: e.memberId ?? "",
        type: e.templateId ?? "RENEWAL",
        phoneNumber: e.Member?.phone ?? "",
        message: e.message,
        sentAt: e.createdAt,
        status: e.status === "FAILED" ? "FAILED" : "SENT",
        error: e.status === "FAILED" ? "Delivery failed" : null,
        sentBy: "system",
        createdAt: e.createdAt,
        Member: {
          id: e.Member?.id ?? e.memberId ?? "",
          name: e.Member?.name ?? "Unknown",
          phone: e.Member?.phone ?? "",
          status: "ACTIVE",
          Membership: [] as { endDate: Date }[],
        },
        SentBy: { name: "Fitness360" },
      }));

    return NextResponse.json({ logs });
  } catch (e) {
    if (e instanceof GymContextError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
