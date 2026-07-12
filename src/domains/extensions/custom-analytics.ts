import { prisma } from "@/lib/prisma";
import type {
  CustomAnalyticsAggregation,
  CustomAnalyticsSource,
  MemberStatus,
  PaymentStatus,
  Prisma,
} from "@prisma/client";
import { z } from "zod";

export const createAnalyticsSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  description: z.string().optional(),
  source: z.enum(["MEMBERS", "PAYMENTS", "ATTENDANCE", "CUSTOM_ENTITY"]),
  aggregation: z.enum(["COUNT", "SUM", "AVG"]).default("COUNT"),
  fieldKey: z.string().optional(),
  entitySlug: z.string().optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
  groupBy: z.string().optional(),
});

export async function listCustomAnalytics(gymId: string) {
  return prisma.customAnalyticsDefinition.findMany({
    where: { gymId, isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function createCustomAnalytics(gymId: string, input: z.infer<typeof createAnalyticsSchema>) {
  return prisma.customAnalyticsDefinition.create({
    data: {
      gymId,
      slug: input.slug,
      name: input.name,
      description: input.description,
      source: input.source,
      aggregation: input.aggregation,
      fieldKey: input.fieldKey,
      entitySlug: input.entitySlug,
      filters: (input.filters ?? undefined) as Prisma.InputJsonValue | undefined,
      groupBy: input.groupBy,
    },
  });
}

type AnalyticsDef = {
  source: CustomAnalyticsSource;
  aggregation: CustomAnalyticsAggregation;
  fieldKey: string | null;
  entitySlug: string | null;
  filters: Prisma.JsonValue;
};

export async function runCustomAnalytics(gymId: string, def: AnalyticsDef) {
  const filters = (def.filters && typeof def.filters === "object" && !Array.isArray(def.filters)
    ? def.filters
    : {}) as Record<string, unknown>;

  switch (def.source) {
    case "MEMBERS": {
      const where: Prisma.MemberWhereInput = {
        gymId,
        deletedAt: null,
        ...(filters.status ? { status: filters.status as MemberStatus } : {}),
      };
      if (def.aggregation === "COUNT") {
        const value = await prisma.member.count({ where });
        return { value, aggregation: def.aggregation, source: def.source };
      }
      break;
    }
    case "PAYMENTS": {
      const where: Prisma.PaymentWhereInput = { gymId };
      if (filters.status) where.status = filters.status as PaymentStatus;
      if (def.aggregation === "COUNT") {
        const value = await prisma.payment.count({ where });
        return { value, aggregation: def.aggregation, source: def.source };
      }
      if (def.aggregation === "SUM") {
        const result = await prisma.payment.aggregate({ where, _sum: { amount: true } });
        const value = Number(result._sum.amount ?? 0);
        return { value, aggregation: def.aggregation, source: def.source };
      }
      break;
    }
    case "ATTENDANCE": {
      const where: Prisma.AttendanceWhereInput = { gymId };
      if (def.aggregation === "COUNT") {
        const value = await prisma.attendance.count({ where });
        return { value, aggregation: def.aggregation, source: def.source };
      }
      break;
    }
    case "CUSTOM_ENTITY": {
      if (!def.entitySlug) {
        throw new Error("entitySlug required for CUSTOM_ENTITY analytics");
      }
      const entity = await prisma.customEntityDefinition.findFirst({
        where: { gymId, slug: def.entitySlug },
      });
      if (!entity) throw new Error("Custom entity not found");
      if (def.aggregation === "COUNT") {
        const value = await prisma.customEntityRecord.count({
          where: { gymId, entityId: entity.id },
        });
        return { value, aggregation: def.aggregation, source: def.source, entitySlug: def.entitySlug };
      }
      break;
    }
  }

  throw new Error(`Unsupported aggregation ${def.aggregation} for source ${def.source}`);
}

export async function runCustomAnalyticsBySlug(gymId: string, slug: string) {
  const def = await prisma.customAnalyticsDefinition.findFirst({
    where: { gymId, slug, isActive: true },
  });
  if (!def) return null;
  const result = await runCustomAnalytics(gymId, def);
  return { definition: def, result };
}
