import { prisma } from "@/lib/prisma";

export async function getDietPlanAssignment(gymId: string, memberId: string) {
  return prisma.dietPlanAssignment.findFirst({
    where: { gymId, memberId },
    orderBy: { assignedAt: "desc" },
  });
}

export async function assignDietPlan(
  gymId: string,
  memberId: string,
  data: { title: string; linkUrl?: string; notes?: string },
) {
  return prisma.dietPlanAssignment.create({
    data: {
      gymId,
      memberId,
      title: data.title,
      linkUrl: data.linkUrl,
      notes: data.notes,
    },
  });
}
