import { prisma } from "@/lib/prisma";
import type { ReminderLogStatus } from "@prisma/client";
import type { IReminderLogQueries } from "../interfaces";
import type { ReminderLogFiltersDTO, ReminderLogListResultDTO, ReminderLogRowDTO } from "../types";
import { listCommunicationEvents } from "../communication-ledger";

function eventToLogRow(
  e: Awaited<ReturnType<typeof listCommunicationEvents>>[number],
): ReminderLogRowDTO {
  return {
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
      Membership: [],
    },
    SentBy: { name: "Fitness360" },
  };
}

export class PrismaReminderLogQueries implements IReminderLogQueries {
  async listReminderLogs(
    gymId: string,
    filters: ReminderLogFiltersDTO,
  ): Promise<ReminderLogListResultDTO> {
    const { days = "all", status } = filters;

    const events = await listCommunicationEvents(gymId, { limit: 500 });
    let eventRows = events
      .filter((e) => e.channel === "WHATSAPP")
      .map(eventToLogRow);

    if (days !== "all") {
      const daysNum = parseInt(String(days), 10);
      if (!Number.isNaN(daysNum)) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - daysNum);
        eventRows = eventRows.filter((r) => r.sentAt >= cutoff);
      }
    }

    if (status === "SENT" || status === "FAILED") {
      eventRows = eventRows.filter((r) => r.status === status);
    }

    const eventLegacyIds = new Set(
      events
        .map((e) => e.legacyId)
        .filter((id): id is string => Boolean(id)),
    );

    const legacyWhere: {
      gymId: string;
      sentAt?: { gte: Date };
      status?: ReminderLogStatus;
    } = { gymId };

    if (days !== "all") {
      const daysNum = parseInt(String(days), 10);
      if (!Number.isNaN(daysNum)) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - daysNum);
        legacyWhere.sentAt = { gte: cutoff };
      }
    }

    if (status === "SENT" || status === "FAILED") {
      legacyWhere.status = status;
    }

    const legacyLogs = await prisma.reminderLog.findMany({
      where: legacyWhere,
      include: {
        Member: {
          select: {
            id: true,
            name: true,
            phone: true,
            status: true,
            Membership: {
              orderBy: { endDate: "desc" },
              take: 1,
              select: { endDate: true },
            },
          },
        },
        SentBy: { select: { name: true } },
      },
      orderBy: { sentAt: "desc" },
      take: 500,
    });

    const legacyOnly = legacyLogs.filter((log) => !eventLegacyIds.has(log.id));
    const merged = [...eventRows, ...legacyOnly].sort(
      (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
    );

    return { logs: merged.slice(0, 500) };
  }
}
