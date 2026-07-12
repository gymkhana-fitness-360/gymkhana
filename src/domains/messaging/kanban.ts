import { MemberStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { todayIST, addDaysIST } from "@/lib/date-only";

export type KanbanColumn = "renewals" | "admissions" | "expiry";

export async function getMessagingKanban(gymId: string, columns: KanbanColumn[]) {
  const today = todayIST();
  const in7 = addDaysIST(today, 7);
  const out: Record<string, unknown> = {};

  if (columns.includes("renewals")) {
    const renewals = await prisma.member.findMany({
      where: {
        gymId,
        status: MemberStatus.ACTIVE,
        nextRenewalDate: { gte: today, lte: in7 },
      },
      select: { id: true, name: true, phone: true, nextRenewalDate: true },
      orderBy: { nextRenewalDate: "asc" },
      take: 100,
    });
    out.renewals = renewals;
  }

  if (columns.includes("expiry")) {
    const expiry = await prisma.member.findMany({
      where: {
        gymId,
        status: { in: [MemberStatus.ACTIVE, MemberStatus.EXPIRED] },
        nextRenewalDate: { lte: today },
      },
      select: { id: true, name: true, phone: true, nextRenewalDate: true, status: true },
      orderBy: { nextRenewalDate: "asc" },
      take: 100,
    });
    out.expiry = expiry;
  }

  if (columns.includes("admissions")) {
    const admissions = await prisma.member.findMany({
      where: {
        gymId,
        joinDate: { gte: addDaysIST(today, -14) },
      },
      select: { id: true, name: true, phone: true, joinDate: true },
      orderBy: { joinDate: "desc" },
      take: 50,
    });
    out.admissions = admissions;
  }

  return out;
}
