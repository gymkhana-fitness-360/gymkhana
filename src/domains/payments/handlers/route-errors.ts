import { successResponse } from "@/lib/api-response";
import { ApiErrors } from "@/lib/api-handler";
import { BusinessRuleViolation } from "@/lib/crud-business-validation";
import { PermissionError } from "@/lib/permissions";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api-payments");

export function mapCreatePaymentRouteError(error: unknown) {
  if (error instanceof PermissionError) {
    return ApiErrors.permissionDenied("canEditPayments");
  }
  if (error instanceof BusinessRuleViolation && error.code === "PAYMENT_DUPLICATE") {
    try {
      const duplicateData = JSON.parse(error.message);
      return successResponse(
        {
          error: "PAYMENT_DUPLICATE",
          message: duplicateData.message,
          existingPayment: duplicateData.existingPayment,
          canOverride: duplicateData.canOverride,
        },
        409,
      );
    } catch {
      return successResponse(
        {
          error: "PAYMENT_DUPLICATE",
          message: "Possible duplicate payment detected",
          canOverride: true,
        },
        409,
      );
    }
  }
  if (error instanceof BusinessRuleViolation) {
    return ApiErrors.businessRule(error.message, error.code);
  }
  logger.error("Error creating payment:", error as Error);
  return ApiErrors.internal("Failed to create payment");
}
