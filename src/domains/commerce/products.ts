import { prisma } from "@/lib/prisma";
import type { ProductCategory } from "@prisma/client";

export async function listProducts(gymId: string, activeOnly = true) {
  return prisma.product.findMany({
    where: {
      gymId,
      ...(activeOnly ? { isActive: true } : {}),
    },
    orderBy: { name: "asc" },
    take: 100,
  });
}

export async function createProduct(
  gymId: string,
  data: {
    name: string;
    category?: ProductCategory;
    priceInr: number;
    description?: string;
    hsnCode?: string;
    gstRatePercent?: number;
    priceIncludesGst?: boolean;
  },
) {
  return prisma.product.create({
    data: {
      gymId,
      name: data.name,
      category: data.category ?? "SUPPLEMENT",
      priceInr: data.priceInr,
      description: data.description,
      hsnCode: data.hsnCode,
      gstRatePercent: data.gstRatePercent ?? 18,
      priceIncludesGst: data.priceIncludesGst ?? true,
    },
  });
}

export async function updateProduct(
  gymId: string,
  productId: string,
  data: Partial<{
    name: string;
    priceInr: number;
    description: string | null;
    hsnCode: string | null;
    gstRatePercent: number;
    priceIncludesGst: boolean;
    isActive: boolean;
  }>,
) {
  const existing = await prisma.product.findFirst({
    where: { id: productId, gymId },
  });
  if (!existing) return null;
  return prisma.product.update({
    where: { id: productId },
    data,
  });
}
