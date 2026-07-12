import { ErrorLogSource, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const logger = createLogger("error-log");

export type ErrorLogInput = {
  gymId?: string;
  source: ErrorLogSource;
  code: string;
  message: string;
  stack?: string;
  route?: string;
  userId?: string;
  prismaCode?: string;
  metadata?: Record<string, unknown>;
};

export async function recordErrorLog(input: ErrorLogInput) {
  try {
    return await prisma.errorLog.create({
      data: {
        gymId: input.gymId,
        source: input.source,
        code: input.code,
        message: input.message.slice(0, 8000),
        stack: input.stack?.slice(0, 16000),
        route: input.route,
        userId: input.userId,
        prismaCode: input.prismaCode,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (e) {
    logger.error("Failed to persist error log", e as Error);
    return null;
  }
}

export async function listErrorLogs(gymId: string | null, limit = 100) {
  return prisma.errorLog.findMany({
    where: gymId ? { gymId } : {},
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
