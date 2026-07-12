import { prisma } from "@/lib/prisma";
import type { OfferStatus, Prisma } from "@prisma/client";

export async function listOffers(gymId: string, status?: OfferStatus) {
  return prisma.offer.findMany({
    where: {
      gymId,
      ...(status ? { status } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
}

export async function createOffer(
  gymId: string,
  data: {
    name: string;
    description?: string;
    discountPercent?: number;
    discountInr?: number;
    validFrom?: Date;
    validUntil?: Date;
    segment?: Prisma.InputJsonValue;
    status?: OfferStatus;
  },
) {
  return prisma.offer.create({
    data: {
      gymId,
      name: data.name,
      description: data.description,
      discountPercent: data.discountPercent,
      discountInr: data.discountInr,
      validFrom: data.validFrom,
      validUntil: data.validUntil,
      segment: data.segment ?? undefined,
      status: data.status ?? "ACTIVE",
    },
  });
}

export async function suggestOfferForQuietPeriod(
  gymId: string,
  quietHint: { dayLabel: string; hour: number } | null,
) {
  const name = quietHint
    ? `Quiet hours promo (${quietHint.dayLabel} ~${quietHint.hour}:00)`
    : "Attendance-based discount";

  return createOffer(gymId, {
    name,
    description: "Suggested from attendance heatmap — fill slow slots",
    discountPercent: 10,
    segment: { source: "attendance_heatmap", quiet: quietHint },
    status: "DRAFT",
  });
}
