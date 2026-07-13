import { prisma } from "@/lib/prisma";

export const PUBLIC_SETTINGS_KEYS = [
  "sessionTimeoutMinutes",
  "reminderSmsEnabled",
  "reminderWhatsappEnabled",
  "defaultReminderDays",
  "maxReminderDays",
  "minReminderDays",
] as const;

function gymKeyWhere(gymId: string, key: string) {
  return { gymId_key: { gymId, key } } as const;
}

export { gymKeyWhere };

export async function listGymSettings(
  gymId: string,
  keys?: string[],
): Promise<Record<string, string>> {
  const settings = await prisma.setting.findMany({
    where: {
      gymId,
      ...(keys?.length ? { key: { in: keys } } : {}),
    },
    orderBy: { key: "asc" },
  });
  const result: Record<string, string> = {};
  for (const row of settings) result[row.key] = row.value;
  return result;
}

export async function getGymSetting(
  gymId: string,
  key: string,
): Promise<string | null> {
  const row = await prisma.setting.findUnique({
    where: gymKeyWhere(gymId, key),
  });
  return row?.value ?? null;
}

export async function upsertGymSetting(
  gymId: string,
  key: string,
  value: string,
  description?: string,
): Promise<void> {
  await prisma.setting.upsert({
    where: gymKeyWhere(gymId, key),
    create: { gymId, key, value, description },
    update: { value, ...(description !== undefined ? { description } : {}) },
  });
}

export async function upsertGymSettings(
  gymId: string,
  entries: Array<{ key: string; value: string }>,
): Promise<void> {
  for (const { key, value } of entries) {
    await upsertGymSetting(gymId, key, value);
  }
}

export function filterAllowedSettingKeys(
  requestedKeys: string[],
  isAdmin: boolean,
): string[] {
  if (isAdmin) return requestedKeys;
  return requestedKeys.filter((k) =>
    (PUBLIC_SETTINGS_KEYS as readonly string[]).includes(k),
  );
}
