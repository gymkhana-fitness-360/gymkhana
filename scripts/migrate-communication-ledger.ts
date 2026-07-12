/**
 * Backfill CommunicationEvent from ReminderLog, WhatsAppSendLog, and MessageLog.
 * Run: npx tsx scripts/migrate-communication-ledger.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function mapReminderStatus(status: string): "SENT" | "FAILED" | "DELIVERED" | "READ" {
  switch (status) {
    case "DELIVERED":
      return "DELIVERED";
    case "READ":
      return "READ";
    case "FAILED":
      return "FAILED";
    default:
      return "SENT";
  }
}

function mapMessageStatus(status: string): "PENDING" | "QUEUED" | "SENT" | "DELIVERED" | "FAILED" {
  switch (status) {
    case "PENDING":
      return "PENDING";
    case "QUEUED":
      return "QUEUED";
    case "DELIVERED":
      return "DELIVERED";
    case "FAILED":
    case "RETRY":
      return "FAILED";
    default:
      return "SENT";
  }
}

async function migrateReminderLogs() {
  const logs = await prisma.reminderLog.findMany({ orderBy: { createdAt: "asc" } });
  let inserted = 0;
  for (const log of logs) {
    await prisma.communicationEvent.upsert({
      where: {
        legacySource_legacyId: { legacySource: "ReminderLog", legacyId: log.id },
      },
      create: {
        gymId: log.gymId,
        memberId: log.memberId,
        channel: "WHATSAPP",
        direction: "OUTBOUND",
        templateId: log.type,
        message: log.message,
        status: mapReminderStatus(log.status),
        provider: "whatsapp",
        legacySource: "ReminderLog",
        legacyId: log.id,
        createdAt: log.sentAt,
        updatedAt: log.createdAt,
      },
      update: {},
    });
    inserted++;
  }
  return inserted;
}

async function migrateWhatsAppSendLogs() {
  const logs = await prisma.whatsAppSendLog.findMany({ orderBy: { createdAt: "asc" } });
  let inserted = 0;
  for (const log of logs) {
    await prisma.communicationEvent.upsert({
      where: {
        legacySource_legacyId: { legacySource: "WhatsAppSendLog", legacyId: log.id },
      },
      create: {
        gymId: log.gymId,
        memberId: log.memberId,
        channel: "WHATSAPP",
        direction: "OUTBOUND",
        templateId: log.type,
        message: `[${log.type}] ${log.memberName}`,
        status: log.status === "FAILED" ? "FAILED" : "SENT",
        provider: "whatsapp",
        legacySource: "WhatsAppSendLog",
        legacyId: log.id,
        createdAt: log.sentAt,
        updatedAt: log.createdAt,
      },
      update: {},
    });
    inserted++;
  }
  return inserted;
}

async function migrateMessageLogs() {
  const logs = await prisma.messageLog.findMany({
    where: { gymId: { not: null } },
    orderBy: { createdAt: "asc" },
  });
  let inserted = 0;
  for (const log of logs) {
    if (!log.gymId) continue;
    await prisma.communicationEvent.upsert({
      where: {
        legacySource_legacyId: { legacySource: "MessageLog", legacyId: log.id },
      },
      create: {
        gymId: log.gymId,
        memberId: log.memberId,
        channel: "WHATSAPP",
        direction: "OUTBOUND",
        message: log.message,
        status: mapMessageStatus(log.status),
        provider: "whatsapp",
        providerMessageId: log.phone,
        legacySource: "MessageLog",
        legacyId: log.id,
        createdAt: log.createdAt,
        updatedAt: log.updatedAt,
      },
      update: {},
    });
    inserted++;
  }
  return inserted;
}

async function main() {
  const reminderCount = await migrateReminderLogs();
  const whatsAppCount = await migrateWhatsAppSendLogs();
  const messageCount = await migrateMessageLogs();
  console.log(
    JSON.stringify(
      {
        reminderLogs: reminderCount,
        whatsAppSendLogs: whatsAppCount,
        messageLogs: messageCount,
        total: reminderCount + whatsAppCount + messageCount,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
