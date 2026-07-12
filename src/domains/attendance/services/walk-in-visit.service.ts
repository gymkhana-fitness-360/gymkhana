"use strict";

import { WalkInVisitKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toDateOnlyIST, todayIST } from "@/lib/date-only";
import {
  assertFreeTrialLifetimeAllowed,
  BusinessRuleViolation,
  validateMemberDisplayName,
  validateMemberPhoneDigits,
  validateWalkInVisitAmount,
} from "@/lib/crud-business-validation";
import { serializeFreeTrialVisit } from "@/lib/free-trial-visit-api";
import { BUSINESS_RULES } from "@/lib/business-rules";

export type CreateWalkInVisitInput = {
  gymId: string;
  kind: WalkInVisitKind;
  name: string;
  phone: string;
  visitDate?: string;
  amount?: number | null;
  notes?: string | null;
  createdById?: string | null;
};

function normalizeWalkInPhone(phoneRaw: string): string {
  const digits = phoneRaw.replace(/\D/g, "");
  const normalized = digits.length >= 10 ? digits.slice(-10) : digits;
  validateMemberPhoneDigits(normalized);
  return normalized;
}

function normalizeWalkInName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toUpperCase();
}

export async function countLifetimeFreeTrialsForPhone(
  gymId: string,
  phone: string
): Promise<number> {
  return prisma.freeTrialVisit.count({
    where: { gymId, phone, kind: WalkInVisitKind.FREE_TRIAL },
  });
}

export async function getWalkInPhoneSummary(gymId: string, phoneRaw: string) {
  const phone = normalizeWalkInPhone(phoneRaw);
  const used = await countLifetimeFreeTrialsForPhone(gymId, phone);
  const max = BUSINESS_RULES.WALK_IN_VISIT.FREE_TRIAL_MAX_LIFETIME;
  return {
    phone,
    freeTrialUsed: used,
    freeTrialRemaining: Math.max(0, max - used),
    freeTrialMaxLifetime: max,
  };
}

export async function listWalkInVisitsForDate(gymId: string, visitDateYmd: string) {
  const visitDate = toDateOnlyIST(visitDateYmd);
  const rows = await prisma.freeTrialVisit.findMany({
    where: { gymId, visitDate },
    orderBy: { createdAt: "desc" },
  });
  return sortWalkInVisitsByName(rows.map(serializeFreeTrialVisit));
}

function sortWalkInVisitsByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

export async function createWalkInVisit(input: CreateWalkInVisitInput) {
  const phone = normalizeWalkInPhone(input.phone);
  const displayName = normalizeWalkInName(input.name);
  validateMemberDisplayName(displayName);

  const visitDate = input.visitDate ? toDateOnlyIST(input.visitDate) : todayIST();
  const amount =
    input.kind === WalkInVisitKind.DAY_PASS && input.amount != null
      ? Number(input.amount)
      : null;

  validateWalkInVisitAmount(input.kind, amount);

  if (input.kind === WalkInVisitKind.FREE_TRIAL) {
    const used = await countLifetimeFreeTrialsForPhone(input.gymId, phone);
    assertFreeTrialLifetimeAllowed(used);
  }

  const notes = input.notes?.trim() || null;

  const row = await prisma.freeTrialVisit.create({
    data: {
      gymId: input.gymId,
      kind: input.kind,
      name: displayName,
      phone,
      visitDate,
      amount,
      notes,
      createdById: input.createdById ?? null,
    },
  });

  return serializeFreeTrialVisit(row);
}

export async function deleteWalkInVisit(gymId: string, id: string) {
  const existing = await prisma.freeTrialVisit.findFirst({ where: { id, gymId } });
  if (!existing) {
    throw new BusinessRuleViolation("NOT_FOUND", "Walk-in visit not found");
  }
  await prisma.freeTrialVisit.delete({ where: { id } });
}
