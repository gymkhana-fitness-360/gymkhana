import { inngest } from "./client";
import { createLogger } from "@/lib/logger";

const logger = createLogger("inngest-domain-events");

const EVENT_TYPES = [
  "payment.recorded",
  "member.created",
  "lead.created",
  "membership.expiring",
  "attendance.checked_in",
  "communication.sent",
] as const;

/**
 * Bridge consumers for outbox → Inngest (M1). Extend per bounded context.
 */
export const handleDomainEvents = inngest.createFunction(
  { id: "handle-domain-events" },
  EVENT_TYPES.map((t) => ({ event: `domain/${t}` })),
  async ({ event }) => {
    logger.info("Domain event received", {
      name: event.name,
      gymId: (event.data as { gymId?: string }).gymId,
    });
    return { ok: true, type: event.name };
  },
);
