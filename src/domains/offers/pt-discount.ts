import { prisma } from "@/lib/prisma";
import { createOffer } from "./service";

/** E-022: attach a PT discount offer to a trainer segment. */
export async function applyPtDiscount(
  gymId: string,
  data: {
    trainerId: string;
    discountPercent: number;
    name?: string;
  },
) {
  const trainer = await prisma.user.findFirst({
    where: { id: data.trainerId },
    select: { id: true, name: true },
  });
  if (!trainer) return null;

  return createOffer(gymId, {
    name: data.name ?? `PT with ${trainer.name} — ${data.discountPercent}% off`,
    description: "PT discount rule",
    discountPercent: data.discountPercent,
    segment: { type: "pt_trainer", trainerId: trainer.id },
    status: "ACTIVE",
  });
}
