import { prisma } from "@/lib/prisma";
import { addDaysIST, todayIST } from "@/domains/kernel/date-utils";

export type ActiveTrialRow = {
  id: string;
  kind: string;
  name: string;
  phone: string;
  visitDate: string;
  amount: number | null;
  notes: string | null;
  ptSessionCount: number | null;
  hasMember: boolean;
  memberId: string | null;
  memberStatus: string | null;
};

export async function listActiveTrials(gymId: string, days = 14) {
  const since = addDaysIST(todayIST(), -days);

  const visits = await prisma.freeTrialVisit.findMany({
    where: {
      gymId,
      visitDate: { gte: since },
    },
    orderBy: { visitDate: "desc" },
    take: 100,
  });

  const phones = [...new Set(visits.map((v) => v.phone.replace(/\D/g, "")))];
  const members = await prisma.member.findMany({
    where: {
      gymId,
      OR: phones.map((digits) => ({
        phone: { contains: digits.slice(-10) },
      })),
    },
    select: { id: true, phone: true, status: true },
  });

  const memberByPhone = new Map<string, (typeof members)[0]>();
  for (const m of members) {
    const digits = m.phone.replace(/\D/g, "").slice(-10);
    memberByPhone.set(digits, m);
  }

  const rows: ActiveTrialRow[] = visits.map((v) => {
    const digits = v.phone.replace(/\D/g, "").slice(-10);
    const member = memberByPhone.get(digits);
    return {
      id: v.id,
      kind: v.kind,
      name: v.name,
      phone: v.phone,
      visitDate: v.visitDate.toISOString().slice(0, 10),
      amount: v.amount != null ? Number(v.amount) : null,
      notes: v.notes,
      ptSessionCount: v.ptSessionCount,
      hasMember: !!member,
      memberId: member?.id ?? null,
      memberStatus: member?.status ?? null,
    };
  });

  const openTrials = rows.filter(
    (r) => r.kind === "FREE_TRIAL" && (!r.hasMember || r.memberStatus !== "ACTIVE"),
  );

  return {
    periodDays: days,
    total: rows.length,
    openTrials: openTrials.length,
    visits: rows,
    candidates: openTrials,
  };
}
