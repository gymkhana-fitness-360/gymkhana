import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { createLogger } from "@/lib/logger";
import { ApiErrors } from "@/lib/api-handler";
import { updatePlanHandler } from "@/domains/memberships/handlers/update-plan";
import { deactivatePlanHandler } from "@/domains/memberships/handlers/deactivate-plan";
import { getPlanCommands } from "@/domains/memberships/adapters";

const logger = createLogger("api-plans");

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: ApiErrors.unauthorized() };
  }
  if (session.user.role !== "ADMIN") {
    return { error: ApiErrors.forbidden("Admin access required") };
  }
  return { session };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  try {
    const gate = await requireAdmin();
    if ("error" in gate) return gate.error;

    const { id } = await params;
    return updatePlanHandler(request, { id }, getPlanCommands());
  } catch (error) {
    logger.error("Plan PUT error:", error as Error);
    return ApiErrors.internal("Failed to update plan");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  try {
    const gate = await requireAdmin();
    if ("error" in gate) return gate.error;

    const { id } = await params;
    return deactivatePlanHandler(request, { id }, getPlanCommands());
  } catch (error) {
    logger.error("Plan DELETE error:", error as Error);
    return ApiErrors.internal("Failed to delete plan");
  }
}
