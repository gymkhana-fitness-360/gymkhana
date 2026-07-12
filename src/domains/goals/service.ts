import { prisma } from "@/lib/prisma";

export async function getActiveGoal(gymId: string) {
  return prisma.goal.findFirst({
    where: { gymId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
}

export async function createRecoveryGoal(
  gymId: string,
  data: {
    targetInr: number;
    title?: string;
    deadline?: Date;
    createdById?: string;
    metricType?: string;
  },
) {
  await prisma.goal.updateMany({
    where: { gymId, status: "ACTIVE" },
    data: { status: "CANCELLED" },
  });

  return prisma.goal.create({
    data: {
      gymId,
      title: data.title ?? `Recover ₹${data.targetInr.toLocaleString("en-IN")}`,
      metricType: data.metricType ?? "recovery",
      targetInr: data.targetInr,
      baselineInr: 0,
      recoveredInr: 0,
      deadline: data.deadline,
      status: "ACTIVE",
      createdById: data.createdById,
    },
  });
}

export async function createPtRevenueGoal(
  gymId: string,
  data: { targetInr: number; deadline?: Date; createdById?: string; title?: string },
) {
  return createRecoveryGoal(gymId, {
    ...data,
    metricType: "pt_revenue",
    title:
      data.title ??
      `Grow PT revenue to ₹${data.targetInr.toLocaleString("en-IN")}`,
  });
}

export async function refreshGoalRecovery(gymId: string, goalId: string) {
  const goal = await prisma.goal.findFirst({ where: { id: goalId, gymId } });
  if (!goal) return null;

  const since = goal.createdAt;
  const where =
    goal.metricType === "pt_revenue"
      ? {
          gymId,
          status: "COMPLETED" as const,
          receivedAt: { gte: since },
          notes: { contains: "PT" },
        }
      : {
          gymId,
          status: "COMPLETED" as const,
          receivedAt: { gte: since },
        };

  const agg = await prisma.payment.aggregate({
    where,
    _sum: { amount: true },
  });

  const recovered = Number(agg._sum.amount ?? 0);
  const status =
    recovered >= Number(goal.targetInr)
      ? "COMPLETED"
      : goal.status;

  return prisma.goal.update({
    where: { id: goalId },
    data: { recoveredInr: recovered, status },
  });
}
