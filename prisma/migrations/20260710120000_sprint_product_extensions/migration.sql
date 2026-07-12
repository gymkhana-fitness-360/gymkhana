-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('ISSUED', 'PAID', 'PARTIAL', 'OVERDUE', 'REFUND', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvoiceTransactionType" AS ENUM ('PAYMENT', 'REFUND');

-- CreateEnum
CREATE TYPE "MembershipLifecycleStatus" AS ENUM ('UPCOMING', 'ONGOING', 'EXPIRING', 'EXPIRED', 'RENEWED');

-- CreateEnum
CREATE TYPE "MemberAcquisitionSource" AS ENUM ('PROMOTIONS', 'WORD_OF_MOUTH', 'REFERRAL', 'WALK_IN', 'OTHER');

-- CreateEnum
CREATE TYPE "MemberFitnessGoal" AS ENUM ('FITNESS', 'BODYBUILDING', 'FAT_LOSS', 'WEIGHT_GAIN', 'OTHER');

-- CreateEnum
CREATE TYPE "FollowUpMethod" AS ENUM ('CALL', 'EMAIL', 'IN_PERSON', 'WHATSAPP', 'OTHER');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('PENDING', 'DONE');

-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'CHEQUE';
ALTER TYPE "PaymentMethod" ADD VALUE 'ONLINE';

-- AlterTable
ALTER TABLE "Bill" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "discountAmount" DECIMAL(10,2),
ADD COLUMN     "discountNote" TEXT,
ADD COLUMN     "dueAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "dueDate" DATE,
ADD COLUMN     "membershipId" TEXT,
ADD COLUMN     "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "status" "BillStatus" NOT NULL DEFAULT 'ISSUED',
ADD COLUMN     "subscriptionFee" DECIMAL(10,2),
ADD COLUMN     "tax" DECIMAL(10,2),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill bill ledger amounts from existing amount column
UPDATE "Bill" SET "dueAmount" = COALESCE("amount", 0) WHERE "dueAmount" = 0 AND "amount" IS NOT NULL;

-- AlterTable
ALTER TABLE "ExpectedPayment" ADD COLUMN     "billId" TEXT;

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "dueDate" DATE,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "status" "ExpenseStatus" NOT NULL DEFAULT 'PAID',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Expense" SET "paidAt" = "paymentDate" WHERE "paidAt" IS NULL;

-- AlterTable
ALTER TABLE "Gym" ADD COLUMN     "currencyCode" TEXT NOT NULL DEFAULT 'INR',
ADD COLUMN     "financialYearEnd" DATE,
ADD COLUMN     "financialYearStart" DATE,
ADD COLUMN     "logoUrl" TEXT;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "email" TEXT,
ADD COLUMN     "goal" "MemberFitnessGoal",
ADD COLUMN     "healthIssue" TEXT,
ADD COLUMN     "pincode" TEXT,
ADD COLUMN     "source" "MemberAcquisitionSource",
ADD COLUMN     "state" TEXT;

-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "lifecycleStatus" "MembershipLifecycleStatus" NOT NULL DEFAULT 'ONGOING',
ADD COLUMN     "previousMembershipId" TEXT,
ADD COLUMN     "sourcePaymentId" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "billId" TEXT;

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "serviceId" TEXT;

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceTransaction" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "billId" TEXT NOT NULL,
    "paymentId" TEXT,
    "type" "InvoiceTransactionType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethod" "PaymentMethod",
    "note" TEXT,
    "referenceId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadFollowUp" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "leadId" TEXT NOT NULL,
    "userId" TEXT,
    "method" "FollowUpMethod" NOT NULL DEFAULT 'CALL',
    "scheduleDate" DATE NOT NULL,
    "outcome" TEXT,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadFollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffNotification" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Service_gymId_idx" ON "Service"("gymId");

-- CreateIndex
CREATE UNIQUE INDEX "Service_gymId_name_key" ON "Service"("gymId", "name");

-- CreateIndex
CREATE INDEX "InvoiceTransaction_gymId_idx" ON "InvoiceTransaction"("gymId");

-- CreateIndex
CREATE INDEX "InvoiceTransaction_billId_idx" ON "InvoiceTransaction"("billId");

-- CreateIndex
CREATE INDEX "InvoiceTransaction_paymentId_idx" ON "InvoiceTransaction"("paymentId");

-- CreateIndex
CREATE INDEX "InvoiceTransaction_occurredAt_idx" ON "InvoiceTransaction"("occurredAt");

-- CreateIndex
CREATE INDEX "LeadFollowUp_gymId_idx" ON "LeadFollowUp"("gymId");

-- CreateIndex
CREATE INDEX "LeadFollowUp_leadId_idx" ON "LeadFollowUp"("leadId");

-- CreateIndex
CREATE INDEX "LeadFollowUp_scheduleDate_idx" ON "LeadFollowUp"("scheduleDate");

-- CreateIndex
CREATE INDEX "LeadFollowUp_status_idx" ON "LeadFollowUp"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE INDEX "StaffNotification_gymId_userId_idx" ON "StaffNotification"("gymId", "userId");

-- CreateIndex
CREATE INDEX "StaffNotification_userId_readAt_idx" ON "StaffNotification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "StaffNotification_createdAt_idx" ON "StaffNotification"("createdAt");

-- CreateIndex
CREATE INDEX "Bill_status_idx" ON "Bill"("status");

-- CreateIndex
CREATE INDEX "Bill_dueDate_idx" ON "Bill"("dueDate");

-- CreateIndex
CREATE INDEX "Bill_deletedAt_idx" ON "Bill"("deletedAt");

-- CreateIndex
CREATE INDEX "ExpectedPayment_billId_idx" ON "ExpectedPayment"("billId");

-- CreateIndex
CREATE INDEX "Expense_status_idx" ON "Expense"("status");

-- CreateIndex
CREATE INDEX "Expense_dueDate_idx" ON "Expense"("dueDate");

-- CreateIndex
CREATE INDEX "Lead_deletedAt_idx" ON "Lead"("deletedAt");

-- CreateIndex
CREATE INDEX "Member_email_idx" ON "Member"("email");

-- CreateIndex
CREATE INDEX "Member_deletedAt_idx" ON "Member"("deletedAt");

-- CreateIndex
CREATE INDEX "Membership_previousMembershipId_idx" ON "Membership"("previousMembershipId");

-- CreateIndex
CREATE INDEX "Membership_lifecycleStatus_idx" ON "Membership"("lifecycleStatus");

-- CreateIndex
CREATE INDEX "Payment_billId_idx" ON "Payment"("billId");

-- CreateIndex
CREATE INDEX "Plan_serviceId_idx" ON "Plan"("serviceId");

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_previousMembershipId_fkey" FOREIGN KEY ("previousMembershipId") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceTransaction" ADD CONSTRAINT "InvoiceTransaction_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceTransaction" ADD CONSTRAINT "InvoiceTransaction_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceTransaction" ADD CONSTRAINT "InvoiceTransaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceTransaction" ADD CONSTRAINT "InvoiceTransaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpectedPayment" ADD CONSTRAINT "ExpectedPayment_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadFollowUp" ADD CONSTRAINT "LeadFollowUp_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadFollowUp" ADD CONSTRAINT "LeadFollowUp_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadFollowUp" ADD CONSTRAINT "LeadFollowUp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffNotification" ADD CONSTRAINT "StaffNotification_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffNotification" ADD CONSTRAINT "StaffNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
