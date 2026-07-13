import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { restoreEntityHandler } from "@/domains/platform/handlers/restore";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string; id: string }> },
) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  const { entity, id } = await params;
  return restoreEntityHandler(request, entity, id);
}
