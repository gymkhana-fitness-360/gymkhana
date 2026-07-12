import { inngest } from "./client";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const logger = createLogger("inngest-outbox");

/**
 * Drain transactional outbox events (GYM-M1-005).
 */
export const processOutboxEvents = inngest.createFunction(
  { id: "process-outbox-events", concurrency: { limit: 1 } },
  { cron: "*/5 * * * *" },
  async ({ step }) => {
    const events = await step.run("fetch-pending", async () =>
      prisma.outboxEvent.findMany({
        where: { publishedAt: null },
        orderBy: { createdAt: "asc" },
        take: 50,
      })
    );

    if (events.length === 0) {
      return { processed: 0 };
    }

    const processedIds = await step.run("dispatch-events", async () => {
      const ids: string[] = [];
      for (const event of events) {
        try {
          await inngest.send({
            name: `domain/${event.type}`,
            data: {
              gymId: event.gymId,
              payload: event.payload,
              outboxId: event.id,
            },
          });
          ids.push(event.id);
        } catch (e) {
          logger.error("Outbox dispatch failed", e as Error, {
            eventId: event.id,
            type: event.type,
          });
        }
      }
      return ids;
    });

    await step.run("mark-processed", async () => {
      if (processedIds.length === 0) return;
      await prisma.outboxEvent.updateMany({
        where: { id: { in: processedIds } },
        data: { publishedAt: new Date() },
      });
    });

    return { processed: processedIds.length, total: events.length };
  }
);
