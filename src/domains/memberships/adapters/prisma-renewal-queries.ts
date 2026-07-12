import { prisma } from "@/lib/prisma";
import { MemberStatus } from "@prisma/client";
import { addDaysIST, todayIST } from "@/lib/date-only";
import type { IRenewalReminderQueries } from "../interfaces";
import type {
  RenewalCandidatesQueryDTO,
  RenewalCandidatesResultDTO,
  RenewalReminderCandidateDTO,
} from "../types";

export class PrismaRenewalReminderQueries implements IRenewalReminderQueries {
  async listReminderCandidates(
    gymId: string,
    query: RenewalCandidatesQueryDTO
  ): Promise<RenewalCandidatesResultDTO> {
    const today = todayIST();
    const minDate = query.fromDate
      ? new Date(query.fromDate)
      : addDaysIST(today, -(query.lookbackDays ?? 30));
    const in3Days = addDaysIST(today, 3);
    const in7Days = addDaysIST(today, 7);

    const rows = await prisma.member.findMany({
      where: {
        gymId,
        status: MemberStatus.ACTIVE,
        nextRenewalDate: {
          gte: minDate,
          lte: in7Days,
        },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        nextRenewalDate: true,
      },
      orderBy: { nextRenewalDate: "asc" },
    });

    const mapRow = (m: (typeof rows)[0]): RenewalReminderCandidateDTO => ({
      id: m.id,
      name: m.name,
      phone: m.phone,
      nextRenewalDate: m.nextRenewalDate?.toISOString() ?? null,
    });

    const dueIn7Days = rows
      .filter((m) => m.nextRenewalDate && new Date(m.nextRenewalDate) <= in7Days)
      .map(mapRow);
    const dueIn3Days = rows
      .filter((m) => m.nextRenewalDate && new Date(m.nextRenewalDate) <= in3Days)
      .map(mapRow);

    return {
      dueIn7Days,
      dueIn3Days,
      minDate: minDate.toISOString(),
      today: today.toISOString(),
    };
  }
}
