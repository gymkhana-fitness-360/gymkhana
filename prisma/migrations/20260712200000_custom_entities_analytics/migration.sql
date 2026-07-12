-- Custom entity definitions & records (per-gym extensibility)
CREATE TYPE "CustomFieldType" AS ENUM ('TEXT', 'NUMBER', 'BOOLEAN', 'DATE', 'SELECT');

CREATE TYPE "CustomAnalyticsSource" AS ENUM ('MEMBERS', 'PAYMENTS', 'ATTENDANCE', 'CUSTOM_ENTITY');

CREATE TYPE "CustomAnalyticsAggregation" AS ENUM ('COUNT', 'SUM', 'AVG');

CREATE TABLE "CustomEntityDefinition" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fields" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomEntityDefinition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomEntityRecord" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "entityId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomEntityRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomAnalyticsDefinition" (
    "id" TEXT NOT NULL,
    "gymId" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "source" "CustomAnalyticsSource" NOT NULL,
    "aggregation" "CustomAnalyticsAggregation" NOT NULL DEFAULT 'COUNT',
    "fieldKey" TEXT,
    "entitySlug" TEXT,
    "filters" JSONB,
    "groupBy" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomAnalyticsDefinition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomEntityDefinition_gymId_slug_key" ON "CustomEntityDefinition"("gymId", "slug");
CREATE INDEX "CustomEntityDefinition_gymId_idx" ON "CustomEntityDefinition"("gymId");

CREATE INDEX "CustomEntityRecord_gymId_entityId_idx" ON "CustomEntityRecord"("gymId", "entityId");

CREATE UNIQUE INDEX "CustomAnalyticsDefinition_gymId_slug_key" ON "CustomAnalyticsDefinition"("gymId", "slug");
CREATE INDEX "CustomAnalyticsDefinition_gymId_idx" ON "CustomAnalyticsDefinition"("gymId");

ALTER TABLE "CustomEntityDefinition" ADD CONSTRAINT "CustomEntityDefinition_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomEntityRecord" ADD CONSTRAINT "CustomEntityRecord_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomEntityRecord" ADD CONSTRAINT "CustomEntityRecord_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "CustomEntityDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomAnalyticsDefinition" ADD CONSTRAINT "CustomAnalyticsDefinition_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;
