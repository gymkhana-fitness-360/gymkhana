import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { todayIST, toDateOnlyIST } from "@/lib/date-only";

export type FutureStackRow = {
  membershipId: string;
  memberId: string;
  memberName: string;
  startDate: string;
  endDate: string;
  canDelete: boolean;
  reason: string;
};

export async function previewFutureMembershipStackCleanup(gymId: string) {
  const today = toDateOnlyIST(todayIST());
  const memberships = await prisma.membership.findMany({
    where: { gymId, startDate: { gt: today } },
    include: { Member: { select: { name: true } }, Plan: { select: { name: true } } },
    orderBy: [{ memberId: "asc" }, { startDate: "asc" }],
    take: 500,
  });

  const byMember = new Map<string, typeof memberships>();
  for (const m of memberships) {
    const list = byMember.get(m.memberId) ?? [];
    list.push(m);
    byMember.set(m.memberId, list);
  }

  const rows: FutureStackRow[] = [];
  for (const [, list] of byMember) {
    if (list.length < 2) continue;
    for (let i = 1; i < list.length; i++) {
      const m = list[i]!;
      rows.push({
        membershipId: m.id,
        memberId: m.memberId,
        memberName: m.Member.name,
        startDate: m.startDate.toISOString().slice(0, 10),
        endDate: m.endDate.toISOString().slice(0, 10),
        canDelete: true,
        reason: `Stacked future membership #${i + 1} for ${m.Plan.name}`,
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    totalCandidates: rows.length,
    rows,
  };
}

export async function applyFutureMembershipStackCleanup(
  gymId: string,
  membershipIds: string[],
  userId: string,
) {
  const deleted: string[] = [];
  for (const id of membershipIds) {
    const m = await prisma.membership.findFirst({ where: { id, gymId } });
    if (!m) continue;
    if (m.startDate <= todayIST()) continue;
    await prisma.membership.delete({ where: { id } });
    deleted.push(id);
    await prisma.auditLog.create({
      data: {
        gymId,
        userId,
        action: "membership_stack_cleanup",
        entityType: "Membership",
        entityId: id,
        details: { reason: "future_stack_cleanup" },
      },
    });
  }
  return { deletedCount: deleted.length, deleted };
}
