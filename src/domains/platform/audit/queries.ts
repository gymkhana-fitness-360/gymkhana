import { prisma } from "@/lib/prisma";

export interface ListAuditLogsInput {
  gymId: string;
  userId?: string;
  action?: string;
  limit: number;
  offset: number;
}

export async function listAuditLogs(input: ListAuditLogsInput) {
  const where: {
    gymId: string;
    userId?: string;
    action?: string;
  } = { gymId: input.gymId };

  if (input.userId) where.userId = input.userId;
  if (input.action) where.action = input.action;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        User: { select: { name: true, contactNumber: true } },
      },
      orderBy: { createdAt: "desc" },
      take: input.limit,
      skip: input.offset,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total };
}
