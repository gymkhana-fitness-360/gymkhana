import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { cachedJson } from "@/lib/api-cache";
import { listPaymentsHandler } from "@/domains/payments/handlers/list-payments";
import { createPaymentHandler } from "@/domains/payments/handlers/create-payment";
import { mapCreatePaymentRouteError } from "@/domains/payments/handlers/route-errors";
import { getPaymentQueries, getPaymentService } from "@/domains/payments/adapters";
import { requirePermission, PermissionError } from "@/lib/permissions";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { createLogger } from "@/lib/logger";
import { ApiErrors } from "@/lib/api-handler";
import { successResponse } from "@/lib/api-response";

const logger = createLogger("api-payments");

export async function GET(request: NextRequest) {
  const rl = withRateLimit(request, "lenient");
  if (rl) return rl;
  try {
    const session = await auth();
    if (!session) return ApiErrors.unauthorized();
    requirePermission(session, "canViewPayments");
    const response = await listPaymentsHandler(request, getPaymentQueries());
    if (!response.ok) return response;
    return cachedJson(await response.json());
  } catch (error) {
    if (error instanceof PermissionError) return ApiErrors.permissionDenied("canViewPayments");
    logger.error("Error fetching payments:", error as Error);
    return ApiErrors.internal("Failed to fetch payments");
  }
}

export async function POST(request: NextRequest) {
  const rl = withRateLimit(request, "strict");
  if (rl) return rl;
  try {
    const session = await auth();
    if (!session) return ApiErrors.unauthorized();
    requirePermission(session, "canEditPayments");
    const response = await createPaymentHandler(request, getPaymentService());
    if (!response.ok) return response;
    return successResponse(await response.json(), 201);
  } catch (error) {
    return mapCreatePaymentRouteError(error);
  }
}
