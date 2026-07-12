import { prisma } from "@/lib/prisma";

export async function createOrderLine(
  gymId: string,
  data: {
    memberId?: string;
    productId: string;
    quantity?: number;
    notes?: string;
  },
) {
  const product = await prisma.product.findFirst({
    where: { id: data.productId, gymId, isActive: true },
  });
  if (!product) return null;

  const qty = data.quantity ?? 1;
  return prisma.orderLine.create({
    data: {
      gymId,
      memberId: data.memberId,
      productId: product.id,
      quantity: qty,
      unitPriceInr: product.priceInr,
      notes: data.notes,
    },
    include: { Product: { select: { name: true, category: true } } },
  });
}

export async function listOrderLinesForMember(gymId: string, memberId: string) {
  return prisma.orderLine.findMany({
    where: { gymId, memberId },
    include: { Product: { select: { name: true, category: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}
