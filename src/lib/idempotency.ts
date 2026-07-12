/**
 * Idempotency - exactly-once processing for payments and messages
 * Uses Setting model to track processed idempotency keys.
 */

import { prisma } from "@/lib/prisma";

const PREFIX = "idempotency:";

export async function ensureMessageProcessedOnce(
  idempotencyKey: string
): Promise<{ alreadyProcessed: boolean }> {
  const key = `${PREFIX}msg:${idempotencyKey}`;
  const existing = await prisma.setting.findUnique({
    where: { key },
  });
  return { alreadyProcessed: !!existing };
}

export async function markMessageProcessed(idempotencyKey: string): Promise<void> {
  const key = `${PREFIX}msg:${idempotencyKey}`;
  await prisma.setting.upsert({
    where: { key },
    create: { key, value: "processed" },
    update: { value: "processed" },
  });
}

export async function ensurePaymentProcessedOnce(
  idempotencyKey: string
): Promise<{ alreadyProcessed: boolean; paymentId?: string }> {
  const key = `${PREFIX}pay:${idempotencyKey}`;
  const existing = await prisma.setting.findUnique({
    where: { key },
  });
  if (existing) {
    return { alreadyProcessed: true, paymentId: existing.value !== "processed" ? existing.value : undefined };
  }
  return { alreadyProcessed: false };
}

export async function markPaymentProcessed(idempotencyKey: string, paymentId?: string): Promise<void> {
  const key = `${PREFIX}pay:${idempotencyKey}`;
  await prisma.setting.upsert({
    where: { key },
    create: { key, value: paymentId ?? "processed" },
    update: { value: paymentId ?? "processed" },
  });
}

export function createIdempotencyKey(prefix: string, ...parts: string[]): string {
  return `${prefix}:${parts.join(":")}`;
}
