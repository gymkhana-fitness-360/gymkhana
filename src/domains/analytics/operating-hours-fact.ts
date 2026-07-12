import { prisma } from "@/lib/prisma";
import { buildAttendanceHeatmap } from "./attendance-heatmap";

const SETTING_PREFIX = "gym_operating_hours:";

export type OperatingHoursFact = {
  gymId: string;
  peak: { dayLabel: string; hour: number; count: number } | null;
  quiet: { dayLabel: string; hour: number; count: number } | null;
  totalCheckIns: number;
  updatedAt: string;
};

export async function refreshOperatingHoursFact(gymId: string): Promise<OperatingHoursFact> {
  const heatmap = await buildAttendanceHeatmap(gymId, 28);
  const fact: OperatingHoursFact = {
    gymId,
    peak: heatmap.peak,
    quiet: heatmap.quiet,
    totalCheckIns: heatmap.totalCheckIns,
    updatedAt: new Date().toISOString(),
  };

  const key = `${SETTING_PREFIX}${gymId}`;
  await prisma.setting.upsert({
    where: { key },
    create: {
      key,
      value: JSON.stringify(fact),
      description: "Peak/quiet hours from attendance heatmap (nightly)",
    },
    update: { value: JSON.stringify(fact) },
  });

  return fact;
}

export async function getOperatingHoursFact(
  gymId: string,
): Promise<OperatingHoursFact | null> {
  const row = await prisma.setting.findUnique({
    where: { key: `${SETTING_PREFIX}${gymId}` },
  });
  if (!row) return null;
  try {
    return JSON.parse(row.value) as OperatingHoursFact;
  } catch {
    return null;
  }
}

export async function refreshAllGymOperatingHoursFacts() {
  const gyms = await prisma.gym.findMany({ select: { id: true } });
  const results: { gymId: string; ok: boolean }[] = [];
  for (const gym of gyms) {
    try {
      await refreshOperatingHoursFact(gym.id);
      results.push({ gymId: gym.id, ok: true });
    } catch {
      results.push({ gymId: gym.id, ok: false });
    }
  }
  return results;
}
