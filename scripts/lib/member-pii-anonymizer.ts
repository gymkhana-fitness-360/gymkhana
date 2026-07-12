/**
 * Replaces member-linked PII with deterministic-looking fake data while keeping IDs and FK relationships.
 * Phone numbers use +91-style fake mobiles (10-digit national number) within app validation (10–15 digits).
 */

import { faker } from "@faker-js/faker";
import { type PrismaClient, Prisma } from "@prisma/client";

const REDACTED_MESSAGE = "[Redacted for privacy]";
const REDACTED_SHORT = "REDACTED";

/** Keys commonly holding PII in AuditLog.details JSON */
const PII_JSON_KEYS = new Set([
  "name",
  "phone",
  "phoneNumber",
  "email",
  "contactNumber",
  "memberName",
  "emergencyContact",
  "address",
]);

export type MemberFakeProfile = {
  name: string;
  phone: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  dateOfBirth: Date | null;
  address: string | null;
  emergencyContact: string | null;
  photo: string | null;
};

export function sanitizeAuditDetailsJson(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(sanitizeAuditDetailsJson);
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) {
      if (PII_JSON_KEYS.has(k)) {
        out[k] = typeof v === "string" ? REDACTED_SHORT : sanitizeAuditDetailsJson(v);
      } else {
        out[k] = sanitizeAuditDetailsJson(v);
      }
    }
    return out;
  }
  return value;
}

/**
 * Ensures digit-only length 10–15 after stripping non-digits (matches app rules).
 */
export function digitsOnlyLength(phone: string): number {
  return phone.replace(/\D/g, "").length;
}

/**
 * Generate a fake Indian mobile-style E.164 number and register it in `used` (stores full phone string).
 */
export function takeUniqueFakePhone(used: Set<string>): string {
  for (let attempt = 0; attempt < 50_000; attempt++) {
    const national = faker.string.numeric(9);
    const first = faker.helpers.arrayElement(["6", "7", "8", "9"]);
    const phone = `+91${first}${national}`;
    const len = digitsOnlyLength(phone);
    if (len >= 10 && len <= 15 && !used.has(phone)) {
      used.add(phone);
      return phone;
    }
  }
  throw new Error("takeUniqueFakePhone: could not allocate a unique phone");
}

/**
 * Build disjoint intermediate and final phone lists for two-phase unique swap.
 */
export function allocatePhoneSwapBuffers(
  existingPhones: string[],
  count: number,
  rng: { takeUnique: (used: Set<string>) => string }
): { intermediate: string[]; final: string[] } {
  const used = new Set<string>(existingPhones);
  const final: string[] = [];
  for (let i = 0; i < count; i++) {
    final.push(rng.takeUnique(used));
  }
  const used2 = new Set(used);
  const intermediate: string[] = [];
  for (let i = 0; i < count; i++) {
    intermediate.push(rng.takeUnique(used2));
  }
  return { intermediate, final };
}

export function buildFakeMemberProfile(): MemberFakeProfile {
  const gender = faker.helpers.arrayElement(["MALE", "FEMALE", "OTHER"] as const);
  const first = faker.person.firstName(gender === "MALE" ? "male" : gender === "FEMALE" ? "female" : undefined);
  const last = faker.person.lastName();
  const name = `${first} ${last}`.slice(0, 100);
  const dob = faker.datatype.boolean({ probability: 0.85 })
    ? faker.date.birthdate({ min: 16, max: 70, mode: "age" })
    : null;
  const address = faker.datatype.boolean({ probability: 0.7 })
    ? faker.location.streetAddress({ useFullAddress: true }).slice(0, 500)
    : null;
  const emergencyDigits = faker.string.numeric(10);
  const emergencyContact = `Emergency ${faker.person.firstName()}: +91${emergencyDigits}`;

  return {
    name: name.length >= 1 ? name : "Test Member",
    phone: "", // filled by caller after swap
    gender,
    dateOfBirth: dob,
    address,
    emergencyContact: emergencyContact.slice(0, 100),
    photo: null,
  };
}

export type AnonymizeMemberPiiResult = {
  membersProcessed: number;
  messageLogsUpdated: number;
  reminderLogsUpdated: number;
  whatsAppSendLogsUpdated: number;
  remindersUpdated: number;
  paymentsUpdated: number;
  billsUpdated: number;
  expectedPaymentsUpdated: number;
  auditLogsUpdated: number;
  attendanceRowsUpdated: number;
  workoutRowsUpdated: number;
  overdueTrackingUpdated: number;
};

export type AnonymizeOptions = {
  dryRun?: boolean;
  fakerSeed?: number;
};

/**
 * Anonymize all member-linked PII. Preserves member ids and all foreign keys.
 */
export async function anonymizeAllMemberPii(
  prisma: PrismaClient,
  options: AnonymizeOptions = {}
): Promise<AnonymizeMemberPiiResult> {
  const { dryRun = false, fakerSeed } = options;
  if (fakerSeed !== undefined) {
    faker.seed(fakerSeed);
  }

  const result: AnonymizeMemberPiiResult = {
    membersProcessed: 0,
    messageLogsUpdated: 0,
    reminderLogsUpdated: 0,
    whatsAppSendLogsUpdated: 0,
    remindersUpdated: 0,
    paymentsUpdated: 0,
    billsUpdated: 0,
    expectedPaymentsUpdated: 0,
    auditLogsUpdated: 0,
    attendanceRowsUpdated: 0,
    workoutRowsUpdated: 0,
    overdueTrackingUpdated: 0,
  };

  const members = await prisma.member.findMany({
    select: { id: true, phone: true },
    orderBy: { id: "asc" },
  });

  if (members.length === 0) {
    return result;
  }

  const existingPhones = members.map((m) => m.phone);
  const { intermediate, final: finalPhones } = allocatePhoneSwapBuffers(
    existingPhones,
    members.length,
    { takeUnique: takeUniqueFakePhone }
  );

  const profiles: MemberFakeProfile[] = members.map(() => {
    const p = buildFakeMemberProfile();
    return p;
  });

  for (let i = 0; i < members.length; i++) {
    profiles[i].phone = finalPhones[i];
  }

  if (dryRun) {
    result.membersProcessed = members.length;
    return result;
  }

  await prisma.$transaction(
    async (tx) => {
      for (let i = 0; i < members.length; i++) {
        await tx.member.update({
          where: { id: members[i].id },
          data: { phone: intermediate[i] },
        });
      }

      for (let i = 0; i < members.length; i++) {
        const p = profiles[i];
        await tx.member.update({
          where: { id: members[i].id },
          data: {
            phone: p.phone,
            name: p.name,
            gender: p.gender,
            dateOfBirth: p.dateOfBirth,
            address: p.address,
            emergencyContact: p.emergencyContact,
            photo: p.photo,
          },
        });
      }
    },
    { timeout: 120_000 }
  );

  result.membersProcessed = members.length;

  const idToPhone = new Map(members.map((m, i) => [m.id, profiles[i].phone]));
  const idToName = new Map(members.map((m, i) => [m.id, profiles[i].name]));

  for (const m of members) {
    const phone = idToPhone.get(m.id)!;
    const name = idToName.get(m.id)!;

    const ml = await prisma.messageLog.updateMany({
      where: { memberId: m.id },
      data: { phone, message: REDACTED_MESSAGE },
    });
    result.messageLogsUpdated += ml.count;

    const rl = await prisma.reminderLog.updateMany({
      where: { memberId: m.id },
      data: { phoneNumber: phone, message: REDACTED_MESSAGE },
    });
    result.reminderLogsUpdated += rl.count;

    const ws = await prisma.whatsAppSendLog.updateMany({
      where: { memberId: m.id },
      data: { memberName: name },
    });
    result.whatsAppSendLogsUpdated += ws.count;

    const rem = await prisma.reminder.updateMany({
      where: { memberId: m.id },
      data: { message: REDACTED_MESSAGE },
    });
    result.remindersUpdated += rem.count;

    const pay = await prisma.payment.updateMany({
      where: { memberId: m.id },
      data: { reference: null, notes: null, specialOccasion: null },
    });
    result.paymentsUpdated += pay.count;

    const bill = await prisma.bill.updateMany({
      where: { memberId: m.id },
      data: { notes: null },
    });
    result.billsUpdated += bill.count;

    const ep = await prisma.expectedPayment.updateMany({
      where: { memberId: m.id },
      data: { notes: null },
    });
    result.expectedPaymentsUpdated += ep.count;

    const att = await prisma.attendance.updateMany({
      where: { memberId: m.id },
      data: { location: null, qrCodeData: null },
    });
    result.attendanceRowsUpdated += att.count;

    const wo = await prisma.workout.updateMany({
      where: { memberId: m.id },
      data: { notes: null },
    });
    result.workoutRowsUpdated += wo.count;

    const od = await prisma.overdueTracking.updateMany({
      where: { memberId: m.id },
      data: { notes: null },
    });
    result.overdueTrackingUpdated += od.count;
  }

  const orphanLogs = await prisma.messageLog.updateMany({
    where: { memberId: null },
    data: {
      phone: takeUniqueFakePhone(new Set([...idToPhone.values()])),
      message: REDACTED_MESSAGE,
    },
  });
  result.messageLogsUpdated += orphanLogs.count;

  const auditLogs = await prisma.auditLog.findMany({
    where: { details: { not: Prisma.DbNull } },
    select: { id: true, details: true },
  });

  for (const log of auditLogs) {
    if (log.details === null || log.details === undefined) continue;
    const sanitized = sanitizeAuditDetailsJson(log.details) as Prisma.InputJsonValue;
    if (JSON.stringify(sanitized) === JSON.stringify(log.details)) continue;
    await prisma.auditLog.update({
      where: { id: log.id },
      data: { details: sanitized },
    });
    result.auditLogsUpdated += 1;
  }

  return result;
}
