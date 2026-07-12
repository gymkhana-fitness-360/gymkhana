import { getTrainerLeaderboard } from "./leaderboard";

/** E-021: trainer avg revenue per member (wraps leaderboard). */
export async function getTrainerPerformance(gymId: string, days = 90) {
  const board = await getTrainerLeaderboard(gymId, days);
  return {
    periodDays: board.periodDays,
    trainers: board.trainers.map((t) => ({
      ...t,
      performanceScore: t.revenueInr + t.activeClients * 100,
    })),
    topByRevenue: board.trainers[0] ?? null,
    topByClients: [...board.trainers].sort(
      (a, b) => b.activeClients - a.activeClients,
    )[0] ?? null,
  };
}
