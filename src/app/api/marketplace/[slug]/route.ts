import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { patchMarketplaceInstallHandler } from "@/domains/platform/marketplace/detail";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const rl = withRateLimit(request, "moderate");
  if (rl) return rl;

  const { slug } = await params;
  return patchMarketplaceInstallHandler(request, slug);
}
