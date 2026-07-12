-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AccountPlan" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "AccountMemberRole" AS ENUM ('OWNER', 'ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "OAuthClientType" AS ENUM ('ACCOUNT', 'AGENT');

-- CreateEnum
CREATE TYPE "GymFactType" AS ENUM ('METRIC', 'INSIGHT', 'AGGREGATE');

-- CreateEnum
CREATE TYPE "JobExecutionStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AttendanceMethod" AS ENUM ('MANUAL', 'RFID', 'QR_CODE', 'BIOMETRIC', 'GEOFENCE');

-- CreateEnum
CREATE TYPE "WalkInVisitKind" AS ENUM ('FREE_TRIAL', 'DAY_PASS');

-- CreateEnum
CREATE TYPE "ChallengeStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ChallengeType" AS ENUM ('ATTENDANCE', 'WORKOUT_COUNT', 'CALORIES_BURNED', 'WEIGHT_LOSS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('RENT', 'UTILITIES', 'EQUIPMENT', 'MAINTENANCE', 'MARKETING', 'SUPPLIES', 'INSURANCE', 'PROFESSIONAL_SERVICES', 'SOFTWARE_SUBSCRIPTION', 'TRAVEL', 'FOOD_BEVERAGES', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpenseType" AS ENUM ('RECURRING', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('UPI', 'CASH', 'MIXED', 'CARD', 'BANK_TRANSFER', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentSource" AS ENUM ('MANUAL', 'WHATSAPP', 'BULK_IMPORT');

-- CreateEnum
CREATE TYPE "ProgramType" AS ENUM ('MAINTENANCE', 'BODYBUILDING', 'WEIGHT_LOSS');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('SCHEDULED', 'SENT', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('RENEWAL_DUE', 'RENEWAL_OVERDUE', 'PAYMENT_PENDING', 'BIRTHDAY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SUB_ADMIN');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('PENDING', 'QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'RETRY');

-- CreateEnum
CREATE TYPE "AttendanceUploadStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "WhatsAppSendLogType" AS ENUM ('BILL', 'REMINDER');

-- CreateEnum
CREATE TYPE "WhatsAppSendStatus" AS ENUM ('SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "CommunicationChannel" AS ENUM ('WHATSAPP', 'SMS', 'EMAIL', 'IN_APP');

-- CreateEnum
CREATE TYPE "CommunicationDirection" AS ENUM ('OUTBOUND', 'INBOUND');

-- CreateEnum
CREATE TYPE "CommunicationEventStatus" AS ENUM ('PENDING', 'QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'READ');

-- CreateEnum
CREATE TYPE "OpportunityPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('OPEN', 'CONTACTED', 'RECOVERED', 'LOST');

-- CreateEnum
CREATE TYPE "PredictionLabel" AS ENUM ('LIKELY_TO_PAY', 'AT_RISK', 'UNLIKELY');

-- CreateEnum
CREATE TYPE "InferenceSource" AS ENUM ('RULES', 'LLM', 'HYBRID');

-- CreateEnum
CREATE TYPE "ReminderLogType" AS ENUM ('RENEWAL', 'OVERDUE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ReminderLogStatus" AS ENUM ('SENT', 'FAILED', 'DELIVERED', 'READ');

-- CreateEnum
CREATE TYPE "ReceiptType" AS ENUM ('ADMISSION', 'RENEWAL');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('GYM', 'PT');

-- CreateEnum
CREATE TYPE "ClassSessionStatus" AS ENUM ('UPCOMING', 'ONGOING', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ClassBookingStatus" AS ENUM ('CONFIRMED', 'CANCELLED', 'WAITLISTED');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApprovalType" AS ENUM ('SEND_REMINDER', 'BULK_REMINDER');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXECUTED', 'FAILED');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('MERCH', 'SUPPLEMENT');

-- CreateEnum
CREATE TYPE "OrderLineStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SupplementInvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WhatsAppTemplateCategory" AS ENUM ('RENEWAL', 'TRIAL', 'LEAD', 'GENERAL');

-- CreateEnum
CREATE TYPE "WhatsAppCampaignStatus" AS ENUM ('DRAFT', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('WALK_IN', 'WEBSITE', 'WHATSAPP', 'REFERRAL', 'INSTAGRAM', 'PHONE_CALL', 'OTHER');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'TRIAL_SCHEDULED', 'TRIAL_DONE', 'CONVERTED', 'LOST');

-- CreateTable
CREATE TABLE "Account" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "plan" "AccountPlan" NOT NULL DEFAULT 'FREE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" UUID NOT NULL,
    "role" "AccountMemberRole" NOT NULL DEFAULT 'STAFF',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthClient" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecretHash" TEXT NOT NULL,
    "type" "OAuthClientType" NOT NULL,
    "accountId" UUID NOT NULL,
    "gymId" UUID,
    "name" TEXT NOT NULL,
    "scopes" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthAccessToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "accountId" UUID NOT NULL,
    "gymId" UUID,
    "scopes" TEXT[],
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthAccessToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gym" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "publicBookSlug" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "gstin" TEXT,
    "invoiceLegalName" TEXT,
    "invoiceStateCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gym_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymFact" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "factKey" TEXT NOT NULL,
    "factType" "GymFactType" NOT NULL DEFAULT 'METRIC',
    "value" JSONB NOT NULL,
    "source" TEXT NOT NULL,
    "validAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymFact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "memberId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "memberId" TEXT NOT NULL,
    "checkIn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkOut" TIMESTAMP(3),
    "location" TEXT,
    "qrCodeData" TEXT,
    "method" "AttendanceMethod" NOT NULL DEFAULT 'MANUAL',

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreeTrialVisit" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "kind" "WalkInVisitKind" NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "visitDate" DATE NOT NULL,
    "amount" DECIMAL(10,2),
    "notes" TEXT,
    "ptSessionCount" INTEGER,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FreeTrialVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bill" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "memberId" TEXT NOT NULL,
    "billNumber" TEXT NOT NULL,
    "programType" "ProgramType" NOT NULL,
    "amount" DECIMAL(10,2),
    "paymentMethod" "PaymentMethod" NOT NULL,
    "month" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3) NOT NULL,
    "nextPaymentDate" TIMESTAMP(3),
    "workoutPlan" TEXT NOT NULL,
    "hideAmount" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "generatedById" TEXT NOT NULL,
    "billSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "ChallengeType" NOT NULL,
    "status" "ChallengeStatus" NOT NULL DEFAULT 'UPCOMING',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "targetValue" INTEGER,
    "prize" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeParticipant" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "challengeId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "currentValue" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChallengeParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "type" "ExpenseType" NOT NULL DEFAULT 'ONE_TIME',
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "vendor" TEXT,
    "reference" TEXT,
    "notes" TEXT,
    "nextDueDate" TIMESTAMP(3),
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "gender" "Gender",
    "dateOfBirth" TIMESTAMP(3),
    "address" TEXT,
    "emergencyContact" TEXT,
    "photo" TEXT,
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextRenewalDate" DATE,
    "lastPaymentDate" DATE,
    "lastReminderSentAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "memberId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "memberId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'COMPLETED',
    "reference" TEXT,
    "notes" TEXT,
    "receivedById" TEXT NOT NULL,
    "receivedAt" DATE NOT NULL,
    "paymentDate" DATE,
    "planId" TEXT,
    "duration" TEXT,
    "source" "PaymentSource",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "friendsFamilyDiscount" BOOLEAN NOT NULL DEFAULT false,
    "isPersonalTrainer" BOOLEAN NOT NULL DEFAULT false,
    "monthlyRate" DECIMAL(10,2),
    "packageDuration" TEXT,
    "specialOccasion" TEXT,
    "studentGymfloPlan" BOOLEAN NOT NULL DEFAULT false,
    "month" INTEGER,
    "year" INTEGER,
    "billSentAt" TIMESTAMP(3),

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "planType" "PlanType" NOT NULL DEFAULT 'GYM',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "memberId" TEXT NOT NULL,
    "type" "ReminderType" NOT NULL,
    "message" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" "ReminderStatus" NOT NULL DEFAULT 'SCHEDULED',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Salary" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "employeeId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "paidById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Salary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OverdueTracking" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "memberId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3),
    "markedInactiveAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "OverdueTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobExecution" (
    "id" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "status" "JobExecutionStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "error" TEXT,

    CONSTRAINT "JobExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainerClient" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "trainerId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainerClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainerCommission" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "trainerId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "commissionRate" DECIMAL(5,2) NOT NULL,
    "baseAmount" DECIMAL(10,2) NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainerCommission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "accountId" UUID,
    "contactNumber" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'SUB_ADMIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "lastPasswordChange" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "commissionRate" DECIMAL(5,2),
    "isTrainer" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "gymId" UUID,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workout" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "memberId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration" INTEGER,
    "caloriesBurned" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Workout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutExercise" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "exerciseName" TEXT NOT NULL,
    "sets" INTEGER NOT NULL,
    "reps" INTEGER NOT NULL,
    "weight" DECIMAL(10,2),
    "restTime" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkoutExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpectedPayment" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "memberId" TEXT NOT NULL,
    "membershipId" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentId" TEXT,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "reminderSentAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpectedPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageLog" (
    "id" TEXT NOT NULL,
    "gymId" UUID,
    "memberId" TEXT,
    "phone" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceUpload" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadDate" TIMESTAMP(3) NOT NULL,
    "parsed" BOOLEAN NOT NULL DEFAULT false,
    "parsedData" JSONB,
    "status" "AttendanceUploadStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChurnPrediction" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "memberId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "attendanceLast30Days" INTEGER NOT NULL,
    "paymentDelayDays" INTEGER,
    "daysUntilExpiry" INTEGER,
    "lastAttendanceDate" TIMESTAMP(3),
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChurnPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderLog" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "memberId" TEXT NOT NULL,
    "type" "ReminderLogType" NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ReminderLogStatus" NOT NULL,
    "error" TEXT,
    "sentBy" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReminderLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ReminderLogType" NOT NULL,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "variables" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReminderTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceiptTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ReceiptType" NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "variables" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceiptTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppSendLog" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "memberId" TEXT NOT NULL,
    "memberName" TEXT NOT NULL,
    "type" "WhatsAppSendLogType" NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "WhatsAppSendStatus" NOT NULL DEFAULT 'SENT',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppSendLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunicationEvent" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "memberId" TEXT,
    "channel" "CommunicationChannel" NOT NULL,
    "direction" "CommunicationDirection" NOT NULL DEFAULT 'OUTBOUND',
    "templateId" TEXT,
    "message" TEXT NOT NULL,
    "status" "CommunicationEventStatus" NOT NULL,
    "provider" TEXT,
    "providerMessageId" TEXT,
    "legacySource" TEXT,
    "legacyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunicationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "memberId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "amountAtRisk" DECIMAL(12,2) NOT NULL,
    "priority" "OpportunityPriority" NOT NULL,
    "reasons" JSONB NOT NULL,
    "payProbability" INTEGER NOT NULL DEFAULT 50,
    "churnRisk" INTEGER NOT NULL DEFAULT 50,
    "predictionLabel" "PredictionLabel" NOT NULL DEFAULT 'AT_RISK',
    "readinessModelVersion" TEXT,
    "featureSnapshot" JSONB,
    "inferenceSource" "InferenceSource" NOT NULL DEFAULT 'RULES',
    "llmAssessment" JSONB,
    "status" "OpportunityStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymClass" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "trainerName" TEXT,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 20,
    "status" "ClassSessionStatus" NOT NULL DEFAULT 'UPCOMING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassBooking" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "classId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" "ClassBookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "bookedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymMarketplaceInstall" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymMarketplaceInstall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentCheckoutLink" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "memberId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "provider" TEXT NOT NULL DEFAULT 'razorpay',
    "externalId" TEXT,
    "checkoutUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'created',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentCheckoutLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "metricType" TEXT NOT NULL DEFAULT 'recovery',
    "targetInr" DECIMAL(12,2) NOT NULL,
    "recoveredInr" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "baselineInr" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deadline" TIMESTAMP(3),
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "type" "ApprovalType" NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB NOT NULL,
    "createdById" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "discountPercent" DECIMAL(5,2),
    "discountInr" DECIMAL(10,2),
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "segment" JSONB,
    "status" "OfferStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ProductCategory" NOT NULL DEFAULT 'SUPPLEMENT',
    "priceInr" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "hsnCode" TEXT,
    "gstRatePercent" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "priceIncludesGst" BOOLEAN NOT NULL DEFAULT true,
    "amazonReferenceUrl" TEXT,
    "amazonReferenceNote" TEXT,
    "amazonReferenceUpdatedAt" TIMESTAMP(3),
    "amazonReferenceUpdatedById" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderLine" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "memberId" TEXT,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPriceInr" DECIMAL(10,2) NOT NULL,
    "status" "OrderLineStatus" NOT NULL DEFAULT 'PENDING',
    "supplementGstInvoiceId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplementGstInvoice" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "memberId" TEXT,
    "buyerName" TEXT,
    "buyerPhone" TEXT,
    "buyerGstin" TEXT,
    "taxableTotalInr" DECIMAL(12,2) NOT NULL,
    "cgstTotalInr" DECIMAL(12,2) NOT NULL,
    "sgstTotalInr" DECIMAL(12,2) NOT NULL,
    "igstTotalInr" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "grandTotalInr" DECIMAL(12,2) NOT NULL,
    "status" "SupplementInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "placeOfSupplyState" TEXT,
    "notes" TEXT,
    "issuedAt" TIMESTAMP(3),
    "issuedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplementGstInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplementGstInvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "productId" TEXT,
    "description" TEXT NOT NULL,
    "hsnCode" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceInr" DECIMAL(10,2) NOT NULL,
    "gstRatePercent" DECIMAL(5,2) NOT NULL,
    "taxableValueInr" DECIMAL(12,2) NOT NULL,
    "cgstInr" DECIMAL(12,2) NOT NULL,
    "sgstInr" DECIMAL(12,2) NOT NULL,
    "igstInr" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "lineTotalInr" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "SupplementGstInvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DietPlanAssignment" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "memberId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "linkUrl" TEXT,
    "notes" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "complianceCheckedAt" TIMESTAMP(3),

    CONSTRAINT "DietPlanAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppTemplate" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "metaTemplateName" TEXT,
    "body" TEXT NOT NULL,
    "category" "WhatsAppTemplateCategory" NOT NULL DEFAULT 'GENERAL',
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppCampaign" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "templateId" TEXT,
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "status" "WhatsAppCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "payload" JSONB,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberOtpChallenge" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "memberId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberOtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "source" "LeadSource" NOT NULL DEFAULT 'WEBSITE',
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "followUpAt" TIMESTAMP(3),
    "assignedToId" TEXT,
    "freeTrialVisitId" TEXT,
    "convertedMemberId" TEXT,
    "lostReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
    "gymId" UUID,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccountMembership_accountId_idx" ON "AccountMembership"("accountId");

-- CreateIndex
CREATE INDEX "AccountMembership_userId_idx" ON "AccountMembership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountMembership_userId_accountId_key" ON "AccountMembership"("userId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthClient_clientId_key" ON "OAuthClient"("clientId");

-- CreateIndex
CREATE INDEX "OAuthClient_accountId_idx" ON "OAuthClient"("accountId");

-- CreateIndex
CREATE INDEX "OAuthClient_gymId_idx" ON "OAuthClient"("gymId");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthAccessToken_tokenHash_key" ON "OAuthAccessToken"("tokenHash");

-- CreateIndex
CREATE INDEX "OAuthAccessToken_clientId_idx" ON "OAuthAccessToken"("clientId");

-- CreateIndex
CREATE INDEX "OAuthAccessToken_accountId_idx" ON "OAuthAccessToken"("accountId");

-- CreateIndex
CREATE INDEX "OAuthAccessToken_expiresAt_idx" ON "OAuthAccessToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Gym_publicBookSlug_key" ON "Gym"("publicBookSlug");

-- CreateIndex
CREATE INDEX "Gym_accountId_idx" ON "Gym"("accountId");

-- CreateIndex
CREATE INDEX "GymFact_gymId_factType_idx" ON "GymFact"("gymId", "factType");

-- CreateIndex
CREATE UNIQUE INDEX "GymFact_gymId_factKey_key" ON "GymFact"("gymId", "factKey");

-- CreateIndex
CREATE INDEX "Achievement_earnedAt_idx" ON "Achievement"("earnedAt");

-- CreateIndex
CREATE INDEX "Achievement_gymId_idx" ON "Achievement"("gymId");

-- CreateIndex
CREATE INDEX "Achievement_memberId_idx" ON "Achievement"("memberId");

-- CreateIndex
CREATE INDEX "Attendance_checkIn_idx" ON "Attendance"("checkIn");

-- CreateIndex
CREATE INDEX "Attendance_gymId_idx" ON "Attendance"("gymId");

-- CreateIndex
CREATE INDEX "Attendance_memberId_idx" ON "Attendance"("memberId");

-- CreateIndex
CREATE INDEX "Attendance_memberId_checkIn_idx" ON "Attendance"("memberId", "checkIn");

-- CreateIndex
CREATE INDEX "Attendance_checkIn_method_idx" ON "Attendance"("checkIn", "method");

-- CreateIndex
CREATE INDEX "Attendance_gymId_checkIn_idx" ON "Attendance"("gymId", "checkIn");

-- CreateIndex
CREATE INDEX "FreeTrialVisit_gymId_idx" ON "FreeTrialVisit"("gymId");

-- CreateIndex
CREATE INDEX "FreeTrialVisit_visitDate_idx" ON "FreeTrialVisit"("visitDate");

-- CreateIndex
CREATE INDEX "FreeTrialVisit_phone_idx" ON "FreeTrialVisit"("phone");

-- CreateIndex
CREATE INDEX "FreeTrialVisit_gymId_phone_kind_idx" ON "FreeTrialVisit"("gymId", "phone", "kind");

-- CreateIndex
CREATE INDEX "FreeTrialVisit_gymId_visitDate_kind_idx" ON "FreeTrialVisit"("gymId", "visitDate", "kind");

-- CreateIndex
CREATE INDEX "Bill_billNumber_idx" ON "Bill"("billNumber");

-- CreateIndex
CREATE INDEX "Bill_createdAt_idx" ON "Bill"("createdAt");

-- CreateIndex
CREATE INDEX "Bill_gymId_idx" ON "Bill"("gymId");

-- CreateIndex
CREATE INDEX "Bill_memberId_idx" ON "Bill"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "Bill_gymId_billNumber_key" ON "Bill"("gymId", "billNumber");

-- CreateIndex
CREATE INDEX "Challenge_endDate_idx" ON "Challenge"("endDate");

-- CreateIndex
CREATE INDEX "Challenge_gymId_idx" ON "Challenge"("gymId");

-- CreateIndex
CREATE INDEX "Challenge_startDate_idx" ON "Challenge"("startDate");

-- CreateIndex
CREATE INDEX "Challenge_status_idx" ON "Challenge"("status");

-- CreateIndex
CREATE INDEX "ChallengeParticipant_challengeId_idx" ON "ChallengeParticipant"("challengeId");

-- CreateIndex
CREATE INDEX "ChallengeParticipant_gymId_idx" ON "ChallengeParticipant"("gymId");

-- CreateIndex
CREATE INDEX "ChallengeParticipant_memberId_idx" ON "ChallengeParticipant"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeParticipant_challengeId_memberId_key" ON "ChallengeParticipant"("challengeId", "memberId");

-- CreateIndex
CREATE INDEX "Expense_category_idx" ON "Expense"("category");

-- CreateIndex
CREATE INDEX "Expense_gymId_paymentDate_idx" ON "Expense"("gymId", "paymentDate");

-- CreateIndex
CREATE INDEX "Expense_gymId_idx" ON "Expense"("gymId");

-- CreateIndex
CREATE INDEX "Expense_paymentDate_idx" ON "Expense"("paymentDate");

-- CreateIndex
CREATE INDEX "Expense_type_idx" ON "Expense"("type");

-- CreateIndex
CREATE INDEX "Member_id_idx" ON "Member"("id");

-- CreateIndex
CREATE INDEX "Member_gymId_idx" ON "Member"("gymId");

-- CreateIndex
CREATE INDEX "Member_phone_idx" ON "Member"("phone");

-- CreateIndex
CREATE INDEX "Member_status_createdAt_idx" ON "Member"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Member_status_idx" ON "Member"("status");

-- CreateIndex
CREATE INDEX "Member_status_joinDate_idx" ON "Member"("status", "joinDate");

-- CreateIndex
CREATE INDEX "Member_nextRenewalDate_idx" ON "Member"("nextRenewalDate");

-- CreateIndex
CREATE INDEX "Member_status_nextRenewalDate_idx" ON "Member"("status", "nextRenewalDate");

-- CreateIndex
CREATE UNIQUE INDEX "Member_gymId_phone_key" ON "Member"("gymId", "phone");

-- CreateIndex
CREATE INDEX "Membership_endDate_idx" ON "Membership"("endDate");

-- CreateIndex
CREATE INDEX "Membership_gymId_idx" ON "Membership"("gymId");

-- CreateIndex
CREATE INDEX "Membership_memberId_endDate_idx" ON "Membership"("memberId", "endDate");

-- CreateIndex
CREATE INDEX "Membership_memberId_idx" ON "Membership"("memberId");

-- CreateIndex
CREATE INDEX "Membership_startDate_endDate_idx" ON "Membership"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "Membership_gymId_endDate_idx" ON "Membership"("gymId", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_memberId_startDate_endDate_key" ON "Membership"("memberId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "Payment_gymId_idx" ON "Payment"("gymId");

-- CreateIndex
CREATE INDEX "Payment_memberId_idx" ON "Payment"("memberId");

-- CreateIndex
CREATE INDEX "Payment_memberId_receivedAt_idx" ON "Payment"("memberId", "receivedAt");

-- CreateIndex
CREATE INDEX "Payment_memberId_paymentDate_idx" ON "Payment"("memberId", "paymentDate");

-- CreateIndex
CREATE INDEX "Payment_method_receivedAt_idx" ON "Payment"("method", "receivedAt");

-- CreateIndex
CREATE INDEX "Payment_gymId_receivedAt_idx" ON "Payment"("gymId", "receivedAt");

-- CreateIndex
CREATE INDEX "Payment_gymId_status_receivedAt_idx" ON "Payment"("gymId", "status", "receivedAt");

-- CreateIndex
CREATE INDEX "Payment_receivedAt_idx" ON "Payment"("receivedAt");

-- CreateIndex
CREATE INDEX "Payment_paymentDate_idx" ON "Payment"("paymentDate");

-- CreateIndex
CREATE INDEX "Payment_status_receivedAt_idx" ON "Payment"("status", "receivedAt");

-- CreateIndex
CREATE INDEX "Payment_year_month_idx" ON "Payment"("year", "month");

-- CreateIndex
CREATE INDEX "Payment_memberId_status_idx" ON "Payment"("memberId", "status");

-- CreateIndex
CREATE INDEX "Plan_gymId_idx" ON "Plan"("gymId");

-- CreateIndex
CREATE INDEX "Plan_planType_durationDays_idx" ON "Plan"("planType", "durationDays");

-- CreateIndex
CREATE INDEX "Reminder_gymId_idx" ON "Reminder"("gymId");

-- CreateIndex
CREATE INDEX "Reminder_scheduledFor_idx" ON "Reminder"("scheduledFor");

-- CreateIndex
CREATE INDEX "Reminder_status_idx" ON "Reminder"("status");

-- CreateIndex
CREATE INDEX "Salary_employeeId_idx" ON "Salary"("employeeId");

-- CreateIndex
CREATE INDEX "Salary_gymId_paymentDate_idx" ON "Salary"("gymId", "paymentDate");

-- CreateIndex
CREATE INDEX "Salary_gymId_idx" ON "Salary"("gymId");

-- CreateIndex
CREATE INDEX "Salary_paymentDate_idx" ON "Salary"("paymentDate");

-- CreateIndex
CREATE INDEX "Salary_year_month_idx" ON "Salary"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");

-- CreateIndex
CREATE INDEX "OverdueTracking_gymId_idx" ON "OverdueTracking"("gymId");

-- CreateIndex
CREATE INDEX "OverdueTracking_memberId_idx" ON "OverdueTracking"("memberId");

-- CreateIndex
CREATE INDEX "OverdueTracking_detectedAt_idx" ON "OverdueTracking"("detectedAt");

-- CreateIndex
CREATE INDEX "OverdueTracking_markedInactiveAt_idx" ON "OverdueTracking"("markedInactiveAt");

-- CreateIndex
CREATE INDEX "OverdueTracking_gymId_resolvedAt_idx" ON "OverdueTracking"("gymId", "resolvedAt");

-- CreateIndex
CREATE UNIQUE INDEX "OverdueTracking_memberId_month_key" ON "OverdueTracking"("memberId", "month");

-- CreateIndex
CREATE INDEX "JobExecution_jobName_idx" ON "JobExecution"("jobName");

-- CreateIndex
CREATE INDEX "JobExecution_jobName_status_idx" ON "JobExecution"("jobName", "status");

-- CreateIndex
CREATE INDEX "TrainerClient_gymId_idx" ON "TrainerClient"("gymId");

-- CreateIndex
CREATE INDEX "TrainerClient_memberId_idx" ON "TrainerClient"("memberId");

-- CreateIndex
CREATE INDEX "TrainerClient_trainerId_idx" ON "TrainerClient"("trainerId");

-- CreateIndex
CREATE INDEX "TrainerClient_trainerId_isActive_idx" ON "TrainerClient"("trainerId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TrainerClient_trainerId_memberId_key" ON "TrainerClient"("trainerId", "memberId");

-- CreateIndex
CREATE INDEX "TrainerCommission_gymId_idx" ON "TrainerCommission"("gymId");

-- CreateIndex
CREATE INDEX "TrainerCommission_isPaid_idx" ON "TrainerCommission"("isPaid");

-- CreateIndex
CREATE INDEX "TrainerCommission_gymId_year_month_idx" ON "TrainerCommission"("gymId", "year", "month");

-- CreateIndex
CREATE INDEX "TrainerCommission_memberId_idx" ON "TrainerCommission"("memberId");

-- CreateIndex
CREATE INDEX "TrainerCommission_trainerId_idx" ON "TrainerCommission"("trainerId");

-- CreateIndex
CREATE INDEX "TrainerCommission_year_month_idx" ON "TrainerCommission"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "User_contactNumber_key" ON "User"("contactNumber");

-- CreateIndex
CREATE INDEX "User_accountId_idx" ON "User"("accountId");

-- CreateIndex
CREATE INDEX "AuditLog_gymId_idx" ON "AuditLog"("gymId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "Workout_date_idx" ON "Workout"("date");

-- CreateIndex
CREATE INDEX "Workout_gymId_idx" ON "Workout"("gymId");

-- CreateIndex
CREATE INDEX "Workout_memberId_idx" ON "Workout"("memberId");

-- CreateIndex
CREATE INDEX "WorkoutExercise_workoutId_idx" ON "WorkoutExercise"("workoutId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpectedPayment_paymentId_key" ON "ExpectedPayment"("paymentId");

-- CreateIndex
CREATE INDEX "ExpectedPayment_gymId_idx" ON "ExpectedPayment"("gymId");

-- CreateIndex
CREATE INDEX "ExpectedPayment_memberId_dueDate_idx" ON "ExpectedPayment"("memberId", "dueDate");

-- CreateIndex
CREATE INDEX "ExpectedPayment_status_dueDate_idx" ON "ExpectedPayment"("status", "dueDate");

-- CreateIndex
CREATE INDEX "ExpectedPayment_dueDate_idx" ON "ExpectedPayment"("dueDate");

-- CreateIndex
CREATE INDEX "MessageLog_gymId_idx" ON "MessageLog"("gymId");

-- CreateIndex
CREATE INDEX "MessageLog_memberId_idx" ON "MessageLog"("memberId");

-- CreateIndex
CREATE INDEX "MessageLog_status_idx" ON "MessageLog"("status");

-- CreateIndex
CREATE INDEX "MessageLog_createdAt_idx" ON "MessageLog"("createdAt");

-- CreateIndex
CREATE INDEX "MessageLog_phone_idx" ON "MessageLog"("phone");

-- CreateIndex
CREATE INDEX "AttendanceUpload_gymId_idx" ON "AttendanceUpload"("gymId");

-- CreateIndex
CREATE INDEX "AttendanceUpload_uploadedById_idx" ON "AttendanceUpload"("uploadedById");

-- CreateIndex
CREATE INDEX "AttendanceUpload_uploadDate_idx" ON "AttendanceUpload"("uploadDate");

-- CreateIndex
CREATE INDEX "AttendanceUpload_status_idx" ON "AttendanceUpload"("status");

-- CreateIndex
CREATE INDEX "ChurnPrediction_gymId_idx" ON "ChurnPrediction"("gymId");

-- CreateIndex
CREATE INDEX "ChurnPrediction_memberId_idx" ON "ChurnPrediction"("memberId");

-- CreateIndex
CREATE INDEX "ChurnPrediction_riskLevel_idx" ON "ChurnPrediction"("riskLevel");

-- CreateIndex
CREATE INDEX "ChurnPrediction_calculatedAt_idx" ON "ChurnPrediction"("calculatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChurnPrediction_gymId_memberId_key" ON "ChurnPrediction"("gymId", "memberId");

-- CreateIndex
CREATE INDEX "ReminderLog_gymId_idx" ON "ReminderLog"("gymId");

-- CreateIndex
CREATE INDEX "ReminderLog_memberId_idx" ON "ReminderLog"("memberId");

-- CreateIndex
CREATE INDEX "ReminderLog_sentAt_idx" ON "ReminderLog"("sentAt");

-- CreateIndex
CREATE INDEX "ReminderLog_type_idx" ON "ReminderLog"("type");

-- CreateIndex
CREATE INDEX "ReminderLog_status_idx" ON "ReminderLog"("status");

-- CreateIndex
CREATE INDEX "ReminderLog_gymId_sentAt_idx" ON "ReminderLog"("gymId", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderTemplate_name_key" ON "ReminderTemplate"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ReceiptTemplate_name_key" ON "ReceiptTemplate"("name");

-- CreateIndex
CREATE INDEX "WhatsAppSendLog_gymId_idx" ON "WhatsAppSendLog"("gymId");

-- CreateIndex
CREATE INDEX "WhatsAppSendLog_memberId_idx" ON "WhatsAppSendLog"("memberId");

-- CreateIndex
CREATE INDEX "WhatsAppSendLog_sentAt_idx" ON "WhatsAppSendLog"("sentAt");

-- CreateIndex
CREATE INDEX "WhatsAppSendLog_type_idx" ON "WhatsAppSendLog"("type");

-- CreateIndex
CREATE INDEX "CommunicationEvent_gymId_idx" ON "CommunicationEvent"("gymId");

-- CreateIndex
CREATE INDEX "CommunicationEvent_memberId_idx" ON "CommunicationEvent"("memberId");

-- CreateIndex
CREATE INDEX "CommunicationEvent_channel_idx" ON "CommunicationEvent"("channel");

-- CreateIndex
CREATE INDEX "CommunicationEvent_status_idx" ON "CommunicationEvent"("status");

-- CreateIndex
CREATE INDEX "CommunicationEvent_createdAt_idx" ON "CommunicationEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CommunicationEvent_legacySource_legacyId_key" ON "CommunicationEvent"("legacySource", "legacyId");

-- CreateIndex
CREATE INDEX "Opportunity_gymId_status_priority_idx" ON "Opportunity"("gymId", "status", "priority");

-- CreateIndex
CREATE INDEX "Opportunity_gymId_status_predictionLabel_idx" ON "Opportunity"("gymId", "status", "predictionLabel");

-- CreateIndex
CREATE INDEX "Opportunity_gymId_memberId_idx" ON "Opportunity"("gymId", "memberId");

-- CreateIndex
CREATE INDEX "Opportunity_createdAt_idx" ON "Opportunity"("createdAt");

-- CreateIndex
CREATE INDEX "GymClass_gymId_startsAt_idx" ON "GymClass"("gymId", "startsAt");

-- CreateIndex
CREATE INDEX "GymClass_gymId_status_idx" ON "GymClass"("gymId", "status");

-- CreateIndex
CREATE INDEX "ClassBooking_gymId_idx" ON "ClassBooking"("gymId");

-- CreateIndex
CREATE INDEX "ClassBooking_memberId_idx" ON "ClassBooking"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassBooking_classId_memberId_key" ON "ClassBooking"("classId", "memberId");

-- CreateIndex
CREATE INDEX "GymMarketplaceInstall_gymId_idx" ON "GymMarketplaceInstall"("gymId");

-- CreateIndex
CREATE UNIQUE INDEX "GymMarketplaceInstall_gymId_slug_key" ON "GymMarketplaceInstall"("gymId", "slug");

-- CreateIndex
CREATE INDEX "PaymentCheckoutLink_gymId_idx" ON "PaymentCheckoutLink"("gymId");

-- CreateIndex
CREATE INDEX "PaymentCheckoutLink_memberId_idx" ON "PaymentCheckoutLink"("memberId");

-- CreateIndex
CREATE INDEX "PaymentCheckoutLink_externalId_idx" ON "PaymentCheckoutLink"("externalId");

-- CreateIndex
CREATE INDEX "Goal_gymId_status_idx" ON "Goal"("gymId", "status");

-- CreateIndex
CREATE INDEX "Approval_gymId_status_idx" ON "Approval"("gymId", "status");

-- CreateIndex
CREATE INDEX "Approval_createdAt_idx" ON "Approval"("createdAt");

-- CreateIndex
CREATE INDEX "Offer_gymId_status_idx" ON "Offer"("gymId", "status");

-- CreateIndex
CREATE INDEX "Product_gymId_isActive_idx" ON "Product"("gymId", "isActive");

-- CreateIndex
CREATE INDEX "OrderLine_gymId_memberId_idx" ON "OrderLine"("gymId", "memberId");

-- CreateIndex
CREATE INDEX "OrderLine_gymId_status_idx" ON "OrderLine"("gymId", "status");

-- CreateIndex
CREATE INDEX "OrderLine_supplementGstInvoiceId_idx" ON "OrderLine"("supplementGstInvoiceId");

-- CreateIndex
CREATE INDEX "SupplementGstInvoice_gymId_status_idx" ON "SupplementGstInvoice"("gymId", "status");

-- CreateIndex
CREATE INDEX "SupplementGstInvoice_memberId_idx" ON "SupplementGstInvoice"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplementGstInvoice_gymId_invoiceNumber_key" ON "SupplementGstInvoice"("gymId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "SupplementGstInvoiceLine_invoiceId_idx" ON "SupplementGstInvoiceLine"("invoiceId");

-- CreateIndex
CREATE INDEX "DietPlanAssignment_gymId_memberId_idx" ON "DietPlanAssignment"("gymId", "memberId");

-- CreateIndex
CREATE INDEX "WhatsAppTemplate_gymId_category_idx" ON "WhatsAppTemplate"("gymId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppTemplate_gymId_name_key" ON "WhatsAppTemplate"("gymId", "name");

-- CreateIndex
CREATE INDEX "WhatsAppCampaign_gymId_status_idx" ON "WhatsAppCampaign"("gymId", "status");

-- CreateIndex
CREATE INDEX "MemberOtpChallenge_gymId_phone_idx" ON "MemberOtpChallenge"("gymId", "phone");

-- CreateIndex
CREATE INDEX "Lead_gymId_status_idx" ON "Lead"("gymId", "status");

-- CreateIndex
CREATE INDEX "Lead_gymId_phone_idx" ON "Lead"("gymId", "phone");

-- CreateIndex
CREATE INDEX "Lead_gymId_followUpAt_idx" ON "Lead"("gymId", "followUpAt");

-- CreateIndex
CREATE INDEX "Lead_gymId_status_createdAt_idx" ON "Lead"("gymId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_publishedAt_createdAt_idx" ON "OutboxEvent"("publishedAt", "createdAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_gymId_idx" ON "OutboxEvent"("gymId");

-- CreateIndex
CREATE INDEX "OutboxEvent_type_idx" ON "OutboxEvent"("type");

-- AddForeignKey
ALTER TABLE "AccountMembership" ADD CONSTRAINT "AccountMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountMembership" ADD CONSTRAINT "AccountMembership_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthClient" ADD CONSTRAINT "OAuthClient_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthClient" ADD CONSTRAINT "OAuthClient_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthAccessToken" ADD CONSTRAINT "OAuthAccessToken_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "OAuthClient"("clientId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gym" ADD CONSTRAINT "Gym_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymFact" ADD CONSTRAINT "GymFact_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreeTrialVisit" ADD CONSTRAINT "FreeTrialVisit_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreeTrialVisit" ADD CONSTRAINT "FreeTrialVisit_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeParticipant" ADD CONSTRAINT "ChallengeParticipant_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeParticipant" ADD CONSTRAINT "ChallengeParticipant_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeParticipant" ADD CONSTRAINT "ChallengeParticipant_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Salary" ADD CONSTRAINT "Salary_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Salary" ADD CONSTRAINT "Salary_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Salary" ADD CONSTRAINT "Salary_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OverdueTracking" ADD CONSTRAINT "OverdueTracking_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OverdueTracking" ADD CONSTRAINT "OverdueTracking_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerClient" ADD CONSTRAINT "TrainerClient_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerClient" ADD CONSTRAINT "TrainerClient_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerClient" ADD CONSTRAINT "TrainerClient_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerCommission" ADD CONSTRAINT "TrainerCommission_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerCommission" ADD CONSTRAINT "TrainerCommission_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerCommission" ADD CONSTRAINT "TrainerCommission_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutExercise" ADD CONSTRAINT "WorkoutExercise_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpectedPayment" ADD CONSTRAINT "ExpectedPayment_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpectedPayment" ADD CONSTRAINT "ExpectedPayment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpectedPayment" ADD CONSTRAINT "ExpectedPayment_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageLog" ADD CONSTRAINT "MessageLog_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageLog" ADD CONSTRAINT "MessageLog_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceUpload" ADD CONSTRAINT "AttendanceUpload_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceUpload" ADD CONSTRAINT "AttendanceUpload_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChurnPrediction" ADD CONSTRAINT "ChurnPrediction_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChurnPrediction" ADD CONSTRAINT "ChurnPrediction_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderLog" ADD CONSTRAINT "ReminderLog_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderLog" ADD CONSTRAINT "ReminderLog_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderLog" ADD CONSTRAINT "ReminderLog_sentBy_fkey" FOREIGN KEY ("sentBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppSendLog" ADD CONSTRAINT "WhatsAppSendLog_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppSendLog" ADD CONSTRAINT "WhatsAppSendLog_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationEvent" ADD CONSTRAINT "CommunicationEvent_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationEvent" ADD CONSTRAINT "CommunicationEvent_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymClass" ADD CONSTRAINT "GymClass_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassBooking" ADD CONSTRAINT "ClassBooking_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassBooking" ADD CONSTRAINT "ClassBooking_classId_fkey" FOREIGN KEY ("classId") REFERENCES "GymClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassBooking" ADD CONSTRAINT "ClassBooking_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymMarketplaceInstall" ADD CONSTRAINT "GymMarketplaceInstall_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentCheckoutLink" ADD CONSTRAINT "PaymentCheckoutLink_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentCheckoutLink" ADD CONSTRAINT "PaymentCheckoutLink_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_supplementGstInvoiceId_fkey" FOREIGN KEY ("supplementGstInvoiceId") REFERENCES "SupplementGstInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplementGstInvoice" ADD CONSTRAINT "SupplementGstInvoice_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplementGstInvoice" ADD CONSTRAINT "SupplementGstInvoice_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplementGstInvoiceLine" ADD CONSTRAINT "SupplementGstInvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "SupplementGstInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplementGstInvoiceLine" ADD CONSTRAINT "SupplementGstInvoiceLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DietPlanAssignment" ADD CONSTRAINT "DietPlanAssignment_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DietPlanAssignment" ADD CONSTRAINT "DietPlanAssignment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppTemplate" ADD CONSTRAINT "WhatsAppTemplate_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppCampaign" ADD CONSTRAINT "WhatsAppCampaign_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

