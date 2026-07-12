import { PrismaClient } from "@prisma/client";
import { getRuntimeDatabaseUrl } from "@/lib/prisma-env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const runtimeUrl = getRuntimeDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    ...(runtimeUrl && {
      datasources: { db: { url: runtimeUrl } },
    }),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
