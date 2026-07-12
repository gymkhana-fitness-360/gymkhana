import type { LeadSource, LeadStatus } from "@prisma/client";
import { WalkInVisitKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createWalkInVisit } from "@/domains/attendance/services/walk-in-visit.service";
import { publishDomainEvent } from "@/lib/platform/outbox";

export type CreateLeadInput = {
  name: string;
  phone: string;
  email?: string;
  source?: LeadSource;
  notes?: string;
  followUpAt?: Date;
  assignedToId?: string;
};

export type UpdateLeadInput = {
  status?: LeadStatus;
  notes?: string;
  followUpAt?: Date | null;
  assignedToId?: string | null;
  lostReason?: string;
};

export async function listLeads(
  gymId: string,
  filters?: { status?: LeadStatus; limit?: number },
) {
  return prisma.lead.findMany({
    where: {
      gymId,
      ...(filters?.status ? { status: filters.status } : {}),
    },
    orderBy: [{ followUpAt: "asc" }, { createdAt: "desc" }],
    take: filters?.limit ?? 100,
  });
}

export async function createLead(gymId: string, input: CreateLeadInput) {
  const lead = await prisma.lead.create({
    data: {
      gymId,
      name: input.name.trim(),
      phone: input.phone.replace(/\D/g, "").slice(-10),
      email: input.email,
      source: input.source ?? "WEBSITE",
      notes: input.notes,
      followUpAt: input.followUpAt,
      assignedToId: input.assignedToId,
    },
  });

  await publishDomainEvent(
    "lead.created",
    { leadId: lead.id, source: lead.source },
    gymId,
  );

  return lead;
}

export async function updateLead(
  gymId: string,
  leadId: string,
  input: UpdateLeadInput,
) {
  const existing = await prisma.lead.findFirst({
    where: { id: leadId, gymId },
  });
  if (!existing) return null;

  return prisma.lead.update({
    where: { id: leadId },
    data: {
      ...(input.status !== undefined && { status: input.status }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.followUpAt !== undefined && { followUpAt: input.followUpAt }),
      ...(input.assignedToId !== undefined && { assignedToId: input.assignedToId }),
      ...(input.lostReason !== undefined && { lostReason: input.lostReason }),
    },
  });
}

/** Book a free trial visit from a lead and advance pipeline status. */
export async function convertLeadToTrial(
  gymId: string,
  leadId: string,
  createdById?: string | null,
) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, gymId },
  });
  if (!lead) return null;

  const visit = await createWalkInVisit({
    gymId,
    kind: WalkInVisitKind.FREE_TRIAL,
    name: lead.name,
    phone: lead.phone,
    notes: lead.notes ?? `From lead ${lead.id}`,
    createdById,
  });

  const updated = await prisma.lead.update({
    where: { id: leadId },
    data: {
      status: "TRIAL_SCHEDULED",
      freeTrialVisitId: visit.id,
    },
  });

  return { lead: updated, trialVisit: visit };
}

/** Match open lead by phone when a member is admitted (GTM-L-003). */
export async function markLeadConvertedByPhone(
  gymId: string,
  phone: string,
  memberId: string,
) {
  const normalized = phone.replace(/\D/g, "").slice(-10);
  const lead = await prisma.lead.findFirst({
    where: {
      gymId,
      phone: normalized,
      status: { notIn: ["CONVERTED", "LOST"] },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!lead) return null;
  return markLeadConverted(gymId, lead.id, memberId);
}

export async function markLeadConverted(
  gymId: string,
  leadId: string,
  memberId: string,
) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, gymId },
  });
  if (!lead) return null;

  return prisma.lead.update({
    where: { id: leadId },
    data: {
      status: "CONVERTED",
      convertedMemberId: memberId,
    },
  });
}

export async function listLeadsDueForFollowUp(gymId: string) {
  const now = new Date();
  return prisma.lead.findMany({
    where: {
      gymId,
      status: { in: ["NEW", "CONTACTED", "TRIAL_SCHEDULED"] },
      followUpAt: { lte: now },
    },
    orderBy: { followUpAt: "asc" },
    take: 50,
  });
}
