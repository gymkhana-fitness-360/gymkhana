import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission, PermissionError } from "@/lib/permissions";
import { createLogger } from "@/lib/logger";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import {
  deletePaymentHandler,
  updatePaymentHandler,
} from "@/domains/payments/handlers/update-payment";

const logger = createLogger("api-payments");

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session) return ApiErrors.unauthorized();
    requirePermission(session, "canEditPayments");
    const { id } = await params;
    return updatePaymentHandler(request, id);
  } catch (err) {
    if (err instanceof PermissionError) {
      return ApiErrors.forbidden();
    }
    logger.error("[PATCH /api/payments/[id]]", err as Error);
    return ApiErrors.internal("Update failed");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;

  try {
    const session = await auth();
    if (!session) return ApiErrors.unauthorized();
    if (session.user.role !== "ADMIN") {
      return ApiErrors.forbidden("Admin access required");
    }
    const { id } = await params;
    return deletePaymentHandler(request, id, session.user.id);
  } catch (err) {
    logger.error("[DELETE /api/payments/[id]]", err as Error);
    return ApiErrors.internal("Delete failed");
  }
}
