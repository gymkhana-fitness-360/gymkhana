import type {
  CommunicationChannel,
  CommunicationDirection,
  CommunicationEventStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type RecordCommunicationEventInput = {
  gymId: string;
  memberId?: string | null;
  channel: CommunicationChannel;
  direction?: CommunicationDirection;
  templateId?: string | null;
  message: string;
  status: CommunicationEventStatus;
  provider?: string | null;
  providerMessageId?: string | null;
  legacySource?: string | null;
  legacyId?: string | null;
};

export async function recordCommunicationEvent(
  input: RecordCommunicationEventInput,
) {
  const data: Prisma.CommunicationEventCreateInput = {
    Gym: { connect: { id: input.gymId } },
    ...(input.memberId ? { Member: { connect: { id: input.memberId } } } : {}),
    channel: input.channel,
    direction: input.direction ?? "OUTBOUND",
    templateId: input.templateId ?? null,
    message: input.message,
    status: input.status,
    provider: input.provider ?? null,
    providerMessageId: input.providerMessageId ?? null,
    legacySource: input.legacySource ?? null,
    legacyId: input.legacyId ?? null,
  };

  if (input.legacySource && input.legacyId) {
    return prisma.communicationEvent.upsert({
      where: {
        legacySource_legacyId: {
          legacySource: input.legacySource,
          legacyId: input.legacyId,
        },
      },
      create: data,
      update: {
        status: input.status,
        message: input.message,
        providerMessageId: input.providerMessageId ?? null,
      },
    });
  }

  return prisma.communicationEvent.create({ data });
}

export async function listCommunicationEvents(
  gymId: string,
  filters?: { memberId?: string; limit?: number },
) {
  return prisma.communicationEvent.findMany({
    where: {
      gymId,
      ...(filters?.memberId ? { memberId: filters.memberId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: filters?.limit ?? 100,
    include: {
      Member: { select: { id: true, name: true, phone: true } },
    },
  });
}
