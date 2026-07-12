import { prisma } from "@/lib/prisma";
import { listProducts } from "./products";

/** E-052: members who bought supplements before and may repurchase. */
export async function listSupplementRepurchaseCandidates(gymId: string) {
  const supplements = await listProducts(gymId, true);
  const supplementIds = supplements
    .filter((p) => p.category === "SUPPLEMENT")
    .map((p) => p.id);

  if (supplementIds.length === 0) {
    return { candidates: [], products: supplements };
  }

  const lines = await prisma.orderLine.findMany({
    where: {
      gymId,
      productId: { in: supplementIds },
      status: "PAID",
      memberId: { not: null },
    },
    include: {
      Member: { select: { id: true, name: true, phone: true } },
      Product: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const seen = new Set<string>();
  const candidates: {
    memberId: string;
    memberName: string;
    phone: string;
    lastProduct: string;
    draftHint: string;
  }[] = [];

  for (const line of lines) {
    if (!line.memberId || !line.Member || seen.has(line.memberId)) continue;
    seen.add(line.memberId);
    candidates.push({
      memberId: line.memberId,
      memberName: line.Member.name,
      phone: line.Member.phone,
      lastProduct: line.Product.name,
      draftHint: `Hi ${line.Member.name.split(" ")[0]}, your ${line.Product.name} may be running low — restock this week?`,
    });
  }

  return { candidates, products: supplements };
}
