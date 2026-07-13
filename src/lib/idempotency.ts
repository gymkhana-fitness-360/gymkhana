/**
 * Idempotency - exactly-once processing for payments and messages (gym-scoped).
 */

import { prisma } from "@/lib/prisma";
import { gymKeyWhere } from "@/domains/platform/settings/service";

const PREFIX = "idempotency:";

export async function ensureMessageProcessedOnce(
  gymId: string,
  idempotencyKey: string,
): Promise<{ alreadyProcessed: boolean }> {
  const key = `${PREFIX}msg:${idempotencyKey}`;
  const existing = await prisma.setting.findUnique({
    where: gymKeyWhere(gymId, key),
  });
  return { alreadyProcessed: !!existing };
}

export async function markMessageProcessed(
  gymId: string,
  idempotencyKey: string,
): Promise<void> {
  const key = `${PREFIX}msg:${idempotencyKey}`;
  await prisma.setting.upsert({
    where: gymKeyWhere(gymId, key),
    create: { gymId, key, value: "processed" },
    update: { value: "processed" },
  });
}

export async function ensurePaymentProcessedOnce(
  gymId: string,
  idempotencyKey: string,
): Promise<{ alreadyProcessed: boolean; paymentId?: string }> {
  const key = `${PREFIX}pay:${idempotencyKey}`;
  const existing = await prisma.setting.findUnique({
    where: gymKeyWhere(gymId, key),
  });
  if (existing) {
    return {
      alreadyProcessed: true,
      paymentId: existing.value !== "processed" ? existing.value : undefined,
    };
  }
  return { alreadyProcessed: false };
}

export async function markPaymentProcessed(
  gymId: string,
  idempotencyKey: string,
  paymentId?: string,
): Promise<void> {
  const key = `${PREFIX}pay:${idempotencyKey}`;
  await prisma.setting.upsert({
    where: gymKeyWhere(gymId, key),
    create: { gymId, key, value: paymentId ?? "processed" },
    update: { value: paymentId ?? "processed" },
  });
}

export function createIdempotencyKey(prefix: string, ...parts: string[]): string {
  return `${prefix}:${parts.join(":")}`;
}
