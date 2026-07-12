import { prisma } from "@/lib/prisma";

export type DomainEventPayload = Record<string, unknown>;

/**
 * Transactional outbox (M1). Persist events for Inngest/cron consumers to publish later.
 */
export async function publishDomainEvent(
  type: string,
  payload: DomainEventPayload,
  gymId?: string | null
): Promise<void> {
  await prisma.outboxEvent.create({
    data: {
      type,
      payload: payload as object,
      gymId: gymId ?? null,
    },
  });
}
