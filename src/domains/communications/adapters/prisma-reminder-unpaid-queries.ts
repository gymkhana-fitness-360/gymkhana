import { prisma } from "@/lib/prisma";
import { MemberStatus } from "@prisma/client";
import { todayIST } from "@/lib/date-only";
import type { IReminderUnpaidQueries } from "../interfaces";
import type { ReminderUnpaidListResultDTO } from "../types";

export class PrismaReminderUnpaidQueries implements IReminderUnpaidQueries {
  async listUnpaidAfterReminders(gymId: string): Promise<ReminderUnpaidListResultDTO> {
    const today = todayIST();

    const overdueMembers = await prisma.membership.findMany({
      where: {
        gymId,
        endDate: { lt: today },
        Member: { status: MemberStatus.ACTIVE },
      },
      include: {
        Member: {
          select: { id: true, name: true, phone: true },
        },
        Plan: { select: { name: true } },
      },
      orderBy: { endDate: "desc" },
      distinct: ["memberId"],
    });

    const memberIds = overdueMembers.map((m) => m.Member.id);
    if (memberIds.length === 0) {
      return { unpaid: [] };
    }

    const reminderLogs = await prisma.reminderLog.findMany({
      where: {
        gymId,
        memberId: { in: memberIds },
        status: "SENT",
      },
      orderBy: { sentAt: "desc" },
      distinct: ["memberId"],
    });

    const remindedMap = new Map(reminderLogs.map((log) => [log.memberId, log.sentAt]));

    const unpaid = overdueMembers
      .filter((m) => remindedMap.has(m.Member.id))
      .map((m) => ({
        membership: {
          id: m.id,
          memberId: m.Member.id,
          endDate: m.endDate,
          amount: m.amount,
        },
        member: {
          id: m.Member.id,
          name: m.Member.name,
          phone: m.Member.phone,
        },
        plan: { name: m.Plan.name },
        lastReminded: remindedMap.get(m.Member.id),
      }));

    return { unpaid };
  }
}
