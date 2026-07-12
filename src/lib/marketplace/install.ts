import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { FLAGSHIP_MARKETPLACE_APPS, getMarketplaceApp } from "@/data/marketplace/catalog";

export async function listMarketplaceInstalls(gymId: string) {
  const installs = await prisma.gymMarketplaceInstall.findMany({
    where: { gymId },
    orderBy: { installedAt: "asc" },
  });
  const bySlug = new Map(installs.map((i) => [i.slug, i]));
  return FLAGSHIP_MARKETPLACE_APPS.map((app) => {
    const row = bySlug.get(app.slug);
    return {
      slug: app.slug,
      name: app.name,
      icon: app.icon,
      status: app.status,
      category: app.category,
      configurePath: app.configurePath,
      memberPath: app.memberPath,
      installed: Boolean(row?.enabled),
      installedAt: row?.installedAt ?? null,
      config: row?.config ?? null,
    };
  });
}

export async function setMarketplaceInstall(
  gymId: string,
  slug: string,
  enabled: boolean,
  config?: Prisma.InputJsonValue,
) {
  const app = getMarketplaceApp(slug);
  if (!app) {
    throw new Error("Unknown marketplace app");
  }
  return prisma.gymMarketplaceInstall.upsert({
    where: { gymId_slug: { gymId, slug } },
    create: {
      gymId,
      slug,
      enabled,
      config: config ?? undefined,
    },
    update: {
      enabled,
      ...(config !== undefined ? { config } : {}),
    },
  });
}

export async function isMarketplaceAppEnabled(gymId: string, slug: string): Promise<boolean> {
  const row = await prisma.gymMarketplaceInstall.findUnique({
    where: { gymId_slug: { gymId, slug } },
  });
  return row?.enabled ?? false;
}
