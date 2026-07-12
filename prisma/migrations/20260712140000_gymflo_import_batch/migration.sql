-- Gymflo import batch: AdminTask, DailyStats, ErrorLog, WhatsAppCampaign extensions

CREATE TYPE "AdminTaskPriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');
CREATE TYPE "AdminTaskStatus" AS ENUM ('PENDING', 'RESOLVED', 'DISMISSED');
CREATE TYPE "ErrorLogSource" AS ENUM ('API', 'CLIENT', 'CRON', 'INNGEST', 'PRISMA');

ALTER TYPE "WhatsAppCampaignStatus" ADD VALUE IF NOT EXISTS 'QUEUED';

CREATE TABLE "AdminTask" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "priority" "AdminTaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "AdminTaskStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    CONSTRAINT "AdminTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DailyStats" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "statDate" DATE NOT NULL,
    "totalMembers" INTEGER NOT NULL DEFAULT 0,
    "activeMembers" INTEGER NOT NULL DEFAULT 0,
    "todayCheckIns" INTEGER NOT NULL DEFAULT 0,
    "currentlyInGym" INTEGER NOT NULL DEFAULT 0,
    "qrCheckInsToday" INTEGER NOT NULL DEFAULT 0,
    "todayCollection" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "todayPaymentCount" INTEGER NOT NULL DEFAULT 0,
    "expiringThisWeek" INTEGER NOT NULL DEFAULT 0,
    "overdueCount" INTEGER NOT NULL DEFAULT 0,
    "renewalsBadge" INTEGER NOT NULL DEFAULT 0,
    "monthPaymentCount" INTEGER NOT NULL DEFAULT 0,
    "monthPaymentTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "attendanceEligible" INTEGER NOT NULL DEFAULT 0,
    "attendanceActiveToday" INTEGER NOT NULL DEFAULT 0,
    "attendanceCheckedIn" INTEGER NOT NULL DEFAULT 0,
    "attendancePending" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DailyStats_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ErrorLog" (
    "id" TEXT NOT NULL,
    "gymId" UUID,
    "source" "ErrorLogSource" NOT NULL,
    "code" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "route" TEXT,
    "userId" TEXT,
    "prismaCode" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "WhatsAppCampaign" ADD COLUMN IF NOT EXISTS "message" TEXT;
ALTER TABLE "WhatsAppCampaign" ADD COLUMN IF NOT EXISTS "segment" JSONB;
ALTER TABLE "WhatsAppCampaign" ADD COLUMN IF NOT EXISTS "analytics" JSONB;
ALTER TABLE "WhatsAppCampaign" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "DailyStats_gymId_statDate_key" ON "DailyStats"("gymId", "statDate");
CREATE INDEX "AdminTask_gymId_status_idx" ON "AdminTask"("gymId", "status");
CREATE INDEX "AdminTask_gymId_type_status_idx" ON "AdminTask"("gymId", "type", "status");
CREATE INDEX "AdminTask_gymId_priority_idx" ON "AdminTask"("gymId", "priority");
CREATE INDEX "AdminTask_createdAt_idx" ON "AdminTask"("createdAt");
CREATE INDEX "DailyStats_gymId_statDate_idx" ON "DailyStats"("gymId", "statDate");
CREATE INDEX "DailyStats_updatedAt_idx" ON "DailyStats"("updatedAt");
CREATE INDEX "ErrorLog_gymId_createdAt_idx" ON "ErrorLog"("gymId", "createdAt");
CREATE INDEX "ErrorLog_source_createdAt_idx" ON "ErrorLog"("source", "createdAt");
CREATE INDEX "ErrorLog_code_idx" ON "ErrorLog"("code");
CREATE INDEX "ErrorLog_createdAt_idx" ON "ErrorLog"("createdAt");

ALTER TABLE "AdminTask" ADD CONSTRAINT "AdminTask_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailyStats" ADD CONSTRAINT "DailyStats_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ErrorLog" ADD CONSTRAINT "ErrorLog_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ErrorLog" ADD CONSTRAINT "ErrorLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
