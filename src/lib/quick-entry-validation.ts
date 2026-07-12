"use strict";

import type { PrismaClient } from "@prisma/client";
import type { ParsedPayment } from "@/lib/services/text-parser.service";
import {
  toDateOnlyIST,
  todayIST,
  addDaysIST,
  compareDateIST,
} from "@/lib/date-only";

const memberSelect = { id: true, name: true, phone: true } as const;

export type QuickEntryMemberRow = { id: string; name: string; phone: string };

export type ResolvedQuickEntryMember =
  | { kind: "ok"; member: QuickEntryMemberRow }
  | { kind: "needs_phone"; member: QuickEntryMemberRow; phoneMask: string }
  | { kind: "ambiguous"; candidates: QuickEntryMemberRow[] }
  | { kind: "none" }
  | { kind: "phone_mismatch" };

/** Digits only for phone comparison */
export function normalizePhoneDigits(input: string): string {
  return input.replace(/\D/g, "");
}

/** Mask for UI hint (last 4 visible conceptually — show stars + last 4). */
export function maskPhoneForHint(phone: string): string {
  const d = normalizePhoneDigits(phone);
  if (d.length < 4) return "****";
  return `******${d.slice(-4)}`;
}

/**
 * User verification: full 10-digit match, or last 4 digits match stored phone.
 */
export function verifyPhoneDigits(storedPhone: string, userInput: string): boolean {
  const s = normalizePhoneDigits(storedPhone);
  const u = normalizePhoneDigits(userInput);
  if (!u || !s) return false;
  if (u.length >= 10) return s === u || s.endsWith(u) || u.endsWith(s);
  if (u.length === 4) return s.slice(-4) === u;
  return false;
}

/** Any Unicode letter (Latin, Devanagari, Tamil, Bengali, etc.) */
const HAS_LETTER = /\p{L}/u;

export function validateQuickEntryMemberName(name: string): { ok: true } | { ok: false; message: string } {
  const t = name.trim();
  if (t.length < 2) {
    return { ok: false, message: "Name is too short — use at least 2 characters." };
  }
  if (!HAS_LETTER.test(t)) {
    return {
      ok: false,
      message: "Could not read a clear name — include letter characters (any script).",
    };
  }
  if (/^\d[\d\s]*$/.test(t)) {
    return { ok: false, message: "Name cannot be only numbers." };
  }
  return { ok: true };
}

export function validateQuickEntryPaymentDate(date: Date): { ok: true } | { ok: false; message: string } {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return { ok: false, message: "Invalid payment date." };
  }
  const d = toDateOnlyIST(date);
  const today = todayIST();
  const maxFuture = addDaysIST(today, 1);
  if (compareDateIST(d, maxFuture) > 0) {
    return { ok: false, message: "Payment date cannot be more than one day in the future." };
  }
  const minDate = new Date(Date.UTC(2019, 11, 31));
  if (compareDateIST(d, minDate) < 0) {
    return { ok: false, message: "Payment date is too far in the past (before 2020)." };
  }
  return { ok: true };
}

/** True if parsed line included a 10-digit (or normalizable) phone that we trust for identity. */
export function parsedPhoneLooksComplete(parsedPhone: string | null): boolean {
  if (!parsedPhone) return false;
  const d = normalizePhoneDigits(parsedPhone);
  return d.length >= 10;
}

/**
 * Resolve member for quick entry: phone-in-text wins; then pending+verify; then useMemberId;
 * then name search (0 / many → ambiguous / single → ok).
 * Phone verification ONLY required when multiple members match (duplicates/ambiguous).
 */
export async function resolveQuickEntryMember(
  prisma: PrismaClient,
  parsed: Pick<ParsedPayment, "name" | "phone">,
  opts: {
    gymId: string;
    pendingMemberId?: string;
    verifyPhone?: string;
    useMemberId?: string;
  }
): Promise<ResolvedQuickEntryMember> {
  const { gymId, pendingMemberId, verifyPhone, useMemberId } = opts;

  if (pendingMemberId && verifyPhone) {
    const m = await prisma.member.findFirst({
      where: { id: pendingMemberId, gymId },
      select: memberSelect,
    });
    if (!m || !verifyPhoneDigits(m.phone, verifyPhone)) {
      return { kind: "phone_mismatch" };
    }
    return { kind: "ok", member: m };
  }

  const digitsInText = parsedPhoneLooksComplete(parsed.phone)
    ? normalizePhoneDigits(parsed.phone!)
    : null;
  if (digitsInText) {
    const byPhone = await prisma.member.findFirst({
      where: { phone: digitsInText, gymId },
      select: memberSelect,
    });
    if (byPhone) {
      return { kind: "ok", member: byPhone };
    }
  }

  if (useMemberId) {
    const m = await prisma.member.findFirst({
      where: { id: useMemberId, gymId },
      select: memberSelect,
    });
    if (!m) {
      return { kind: "none" };
    }
    // User explicitly selected this member - trust it
    return { kind: "ok", member: m };
  }

  const q = parsed.name.trim();
  if (!q) {
    return { kind: "none" };
  }

  const matches = await prisma.member.findMany({
    where: { gymId, name: { contains: q, mode: "insensitive" } },
    take: 15,
    select: memberSelect,
    orderBy: { name: "asc" },
  });

  if (matches.length === 0) {
    return { kind: "none" };
  }

  // Check for exact match first (case-insensitive)
  const exactMatch = matches.find(m => m.name.toLowerCase() === q.toLowerCase());
  if (exactMatch) {
    // Exact match found - use it immediately, no phone verification
    return { kind: "ok", member: exactMatch };
  }

  // No exact match - check if we have multiple partial matches
  if (matches.length > 1) {
    // Multiple partial matches - this is the ONLY case where we need phone verification
    // User must clarify which member they mean
    return { kind: "ambiguous", candidates: matches };
  }

  // Single partial match (e.g., "Bablu" matches "Bablu Chowdhury")
  // Trust it - no phone verification needed
  return { kind: "ok", member: matches[0] };
}
