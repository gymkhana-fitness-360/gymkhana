import { prisma } from "@/lib/prisma";

export type TrainerLeaderboardRow = {
  trainerId: string;
  trainerName: string;
  activeClients: number;
  classSessions: number;
  completedPayments: number;
  revenueInr: number;
  avgRevenuePerClient: number;
};

export async function getTrainerLeaderboard(gymId: string, days = 90) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [clients, classes, commissions] = await Promise.all([
    prisma.trainerClient.findMany({
      where: { gymId, isActive: true },
      include: { User: { select: { id: true, name: true } } },
    }),
    prisma.gymClass.findMany({
      where: { gymId, startsAt: { gte: since } },
      select: { trainerName: true, id: true },
    }),
    prisma.trainerCommission.findMany({
      where: {
        gymId,
        createdAt: { gte: since },
      },
      include: {
        User: { select: { id: true, name: true } },
      },
    }),
  ]);

  const byTrainer = new Map<
    string,
    { name: string; clients: number; classes: number; revenue: number; payments: number }
  >();

  for (const c of clients) {
    const id = c.trainerId;
    const cur = byTrainer.get(id) ?? {
      name: c.User.name,
      clients: 0,
      classes: 0,
      revenue: 0,
      payments: 0,
    };
    cur.clients += 1;
    byTrainer.set(id, cur);
  }

  for (const cls of classes) {
    if (!cls.trainerName) continue;
    const match = [...byTrainer.values()].find(
      (t) => t.name.toLowerCase() === cls.trainerName!.toLowerCase(),
    );
    if (match) match.classes += 1;
  }

  for (const comm of commissions) {
    const id = comm.trainerId;
    const cur = byTrainer.get(id) ?? {
      name: comm.User.name,
      clients: 0,
      classes: 0,
      revenue: 0,
      payments: 0,
    };
    cur.revenue += Number(comm.baseAmount);
    cur.payments += 1;
    byTrainer.set(id, cur);
  }

  const trainers: TrainerLeaderboardRow[] = [...byTrainer.entries()]
    .map(([trainerId, t]) => ({
      trainerId,
      trainerName: t.name,
      activeClients: t.clients,
      classSessions: t.classes,
      completedPayments: t.payments,
      revenueInr: Math.round(t.revenue),
      avgRevenuePerClient:
        t.clients > 0 ? Math.round(t.revenue / t.clients) : 0,
    }))
    .sort((a, b) => b.revenueInr - a.revenueInr || b.activeClients - a.activeClients);

  return {
    periodDays: days,
    trainers,
    topBooked: [...trainers].sort((a, b) => b.classSessions - a.classSessions)[0] ?? null,
  };
}
