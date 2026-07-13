import { prisma } from "@/lib/prisma";
import {
  DEFAULT_LIFECYCLE_TEMPLATE_BODIES,
  LIFECYCLE_TEMPLATE_META,
  lifecycleTemplateSettingKey,
} from "./defaults";
import {
  LIFECYCLE_TEMPLATE_KEYS,
  type LifecycleTemplateData,
  type LifecycleTemplateKey,
  type LifecycleTemplateView,
} from "./types";

const PLACEHOLDER_RE = /\{\{(\w+)\}\}/g;

export function formatFriendlyPlanName(raw?: string | null): string {
  if (!raw?.trim()) return "membership";
  return (
    raw
      .replace(/\s*\(default\)\s*/gi, "")
      .replace(/\s*\([^)]*\)\s*/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "membership"
  );
}

export function daysWord(count: number): string {
  return Math.abs(count) === 1 ? "day" : "days";
}

/** Pick the closest lifecycle template for a member based on days until/since expiry. */
export function pickLifecycleTemplateKey(daysLeft: number): LifecycleTemplateKey {
  if (daysLeft > 2) return "expiring_soon";
  if (daysLeft === 2) return "before_2_days";
  if (daysLeft === 1) return "before_1_day";
  if (daysLeft === 0) return "expiry_day";

  const overdue = Math.abs(daysLeft);
  if (overdue <= 1) return "after_1_day";
  if (overdue <= 7) return "after_7_days";
  if (overdue <= 15) return "after_15_days";
  if (overdue <= 31) return "after_1_month";
  return "after_2_months_special";
}

export function buildLifecycleTemplateData(input: {
  name: string;
  planName?: string | null;
  expiryDate: string;
  daysLeft: number;
  checkInDate?: string;
}): LifecycleTemplateData {
  const n = Math.abs(input.daysLeft);
  return {
    name: input.name,
    plan: formatFriendlyPlanName(input.planName),
    expiryDate: input.expiryDate,
    daysLeft: input.daysLeft,
    n,
    daysWord: daysWord(n),
    checkInDate: input.checkInDate,
  };
}

export const SAMPLE_LIFECYCLE_PREVIEW_DATA: LifecycleTemplateData = {
  name: "Priya",
  plan: "Monthly",
  expiryDate: "15 Jul 2026",
  daysLeft: 2,
  n: 2,
  daysWord: "days",
  checkInDate: "10 Jul 2026",
};

export function renderLifecycleTemplate(
  body: string,
  data: LifecycleTemplateData,
): string {
  const values: Record<string, string> = {
    name: data.name,
    plan: data.plan ?? "membership",
    expiryDate: data.expiryDate,
    daysLeft: String(data.daysLeft),
    n: String(data.n ?? Math.abs(data.daysLeft)),
    daysWord: data.daysWord ?? daysWord(data.n ?? data.daysLeft),
    checkInDate: data.checkInDate ?? data.expiryDate,
  };

  return body.replace(PLACEHOLDER_RE, (_match, key: string) => values[key] ?? "");
}

export function getDefaultLifecycleBody(key: LifecycleTemplateKey): string {
  return DEFAULT_LIFECYCLE_TEMPLATE_BODIES[key];
}

export async function getLifecycleTemplateBody(
  gymId: string,
  key: LifecycleTemplateKey,
): Promise<string> {
  const setting = await prisma.setting.findUnique({
    where: { key: lifecycleTemplateSettingKey(key, gymId) },
  });
  return setting?.value ?? getDefaultLifecycleBody(key);
}

export async function listLifecycleTemplates(gymId: string): Promise<LifecycleTemplateView[]> {
  const keys = LIFECYCLE_TEMPLATE_KEYS.map((key) => lifecycleTemplateSettingKey(key, gymId));
  const settings = await prisma.setting.findMany({
    where: { key: { in: keys } },
  });
  const customByKey = new Map(
    settings.map((s) => {
      const key = s.key.split(":")[1] as LifecycleTemplateKey;
      return [key, s.value];
    }),
  );

  return LIFECYCLE_TEMPLATE_KEYS.map((key) => {
    const custom = customByKey.get(key);
    const defaultBody = getDefaultLifecycleBody(key);
    return {
      ...LIFECYCLE_TEMPLATE_META[key],
      body: custom ?? defaultBody,
      defaultBody,
      isCustom: Boolean(custom),
    };
  });
}

export async function saveLifecycleTemplate(
  gymId: string,
  key: LifecycleTemplateKey,
  body: string,
): Promise<void> {
  const settingKey = lifecycleTemplateSettingKey(key, gymId);
  await prisma.setting.upsert({
    where: { key: settingKey },
    create: { key: settingKey, value: body },
    update: { value: body },
  });
}

export async function resetLifecycleTemplate(
  gymId: string,
  key?: LifecycleTemplateKey,
): Promise<void> {
  const keys = key ? [key] : [...LIFECYCLE_TEMPLATE_KEYS];
  await prisma.setting.deleteMany({
    where: {
      key: { in: keys.map((k) => lifecycleTemplateSettingKey(k, gymId)) },
    },
  });
}

export async function resolveLifecycleMessage(
  gymId: string,
  key: LifecycleTemplateKey,
  data: LifecycleTemplateData,
): Promise<string> {
  const body = await getLifecycleTemplateBody(gymId, key);
  return renderLifecycleTemplate(body, data);
}
