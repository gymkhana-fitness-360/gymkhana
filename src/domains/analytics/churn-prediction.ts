import { prisma } from "@/lib/prisma";
import { mapChunked } from "@/lib/async-batch";
import { loadGymReadinessCalibration } from "@/domains/revenue-opportunities/calibration";
import { refreshMemberReadiness } from "@/domains/revenue-opportunities/refresh-member";

/** @deprecated Use generateOpportunitiesForGym unified pass. Kept for direct calls. */
export async function refreshChurnPredictionsForGym(gymId: string) {
  const calibration = await loadGymReadinessCalibration(gymId);
  const members = await prisma.member.findMany({
    where: { gymId, status: { in: ["ACTIVE", "EXPIRED"] } },
    select: { id: true },
  });
  const results = await mapChunked(members, 10, ({ id }) =>
    refreshMemberReadiness(gymId, id, calibration),
  );
  const written = results.filter(Boolean).length;
  return { gymId, processed: members.length, churnRows: written };
}

export async function refreshChurnPredictionsForAllGyms() {
  const gyms = await prisma.gym.findMany({ select: { id: true } });
  const results = [];
  for (const gym of gyms) {
    results.push(await refreshChurnPredictionsForGym(gym.id));
  }
  return results;
}

/** High lapse-risk members (precomputed nightly). */
export async function listHighChurnMembers(gymId: string, limit = 20) {
  const rows = await prisma.churnPrediction.findMany({
    where: { gymId, riskLevel: { in: ["HIGH_CHURN", "RISK"] } },
    orderBy: [{ score: "desc" }, { calculatedAt: "desc" }],
    take: limit,
    include: {
      Member: { select: { id: true, name: true, phone: true, status: true } },
    },
  });
  return rows.map((r) => ({
    memberId: r.memberId,
    memberName: r.Member.name,
    phone: r.Member.phone,
    memberStatus: r.Member.status,
    churnRisk: r.score,
    riskLevel: r.riskLevel,
    attendanceLast30Days: r.attendanceLast30Days,
    daysUntilExpiry: r.daysUntilExpiry,
  }));
}
