import { prisma } from "@/lib/prisma";

const AMAZON_HOST_PATTERN = /^https?:\/\/(www\.)?amazon\.(in|com)\//i;

/**
 * Admin-entered product reference only (no scraping, no price fetch).
 * Shown when staff open Supplements or member views catalog — not auto-polled.
 */
export async function getProductMarketplaceReference(
  gymId: string,
  productId: string,
) {
  const product = await prisma.product.findFirst({
    where: { id: productId, gymId, category: "SUPPLEMENT" },
    select: {
      id: true,
      name: true,
      amazonReferenceUrl: true,
      amazonReferenceNote: true,
      amazonReferenceUpdatedAt: true,
    },
  });
  if (!product) return null;

  return {
    productId: product.id,
    productName: product.name,
    referenceUrl: product.amazonReferenceUrl,
    referenceNote: product.amazonReferenceNote,
    updatedAt: product.amazonReferenceUpdatedAt?.toISOString() ?? null,
    disclaimer:
      "Reference link is entered by gym staff for ordering context. Fitness360 does not scrape Amazon, compare prices, or guarantee availability. Staff must verify on Amazon before placing an order on behalf of a member.",
  };
}

export async function setProductMarketplaceReference(
  gymId: string,
  productId: string,
  userId: string,
  data: { referenceUrl?: string | null; referenceNote?: string | null },
) {
  const product = await prisma.product.findFirst({
    where: { id: productId, gymId },
  });
  if (!product) return null;

  let url = data.referenceUrl?.trim() || null;
  if (url && !AMAZON_HOST_PATTERN.test(url)) {
    return { error: "invalid_amazon_url" as const };
  }

  const updated = await prisma.product.update({
    where: { id: productId },
    data: {
      amazonReferenceUrl: url,
      amazonReferenceNote:
        data.referenceNote?.trim() ||
        (url
          ? "Staff-verified Amazon listing — confirm SKU and price before ordering."
          : null),
      amazonReferenceUpdatedAt: url ? new Date() : null,
      amazonReferenceUpdatedById: url ? userId : null,
    },
    select: {
      id: true,
      amazonReferenceUrl: true,
      amazonReferenceNote: true,
      amazonReferenceUpdatedAt: true,
    },
  });
  return updated;
}
