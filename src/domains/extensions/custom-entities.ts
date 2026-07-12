import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

const fieldSchema = z.object({
  key: z.string().min(1).regex(/^[a-zA-Z][a-zA-Z0-9_]*$/),
  label: z.string().min(1),
  type: z.enum(["TEXT", "NUMBER", "BOOLEAN", "DATE", "SELECT"]),
  required: z.boolean().optional(),
  options: z.array(z.string()).optional(),
});

export const createEntitySchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  description: z.string().optional(),
  fields: z.array(fieldSchema).min(1),
});

export const createRecordSchema = z.object({
  data: z.record(z.string(), z.unknown()),
});

export async function listCustomEntities(gymId: string) {
  return prisma.customEntityDefinition.findMany({
    where: { gymId, isActive: true },
    orderBy: { name: "asc" },
    include: { _count: { select: { Records: true } } },
  });
}

export async function createCustomEntity(gymId: string, input: z.infer<typeof createEntitySchema>) {
  return prisma.customEntityDefinition.create({
    data: {
      gymId,
      slug: input.slug,
      name: input.name,
      description: input.description,
      fields: input.fields,
    },
  });
}

export async function listCustomEntityRecords(gymId: string, entityId: string) {
  const entity = await prisma.customEntityDefinition.findFirst({
    where: { id: entityId, gymId },
  });
  if (!entity) return null;

  const records = await prisma.customEntityRecord.findMany({
    where: { gymId, entityId },
    orderBy: { createdAt: "desc" },
  });

  return { entity, records };
}

export async function createCustomEntityRecord(
  gymId: string,
  entityId: string,
  input: z.infer<typeof createRecordSchema>,
) {
  const entity = await prisma.customEntityDefinition.findFirst({
    where: { id: entityId, gymId, isActive: true },
  });
  if (!entity) return null;

  return prisma.customEntityRecord.create({
    data: {
      gymId,
      entityId,
      data: input.data as Prisma.InputJsonValue,
    },
  });
}
