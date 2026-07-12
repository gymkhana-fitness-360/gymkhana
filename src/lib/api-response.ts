/**
 * Unified API Response Types and Helpers
 * Ensures consistent error/success responses across all endpoints
 */

import { NextResponse } from "next/server";

// Standard error codes
export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "DUPLICATE"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "BAD_REQUEST"
  | "CONFLICT"
  | "ACCOUNT_DEACTIVATED"
  | "SESSION_EXPIRED"
  | "PERMISSION_DENIED"
  | "BUSINESS_RULE_VIOLATION";

interface ApiErrorResponse {
  success: false;
  error: string;
  code: ErrorCode;
  details?: unknown;
}

interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Create a success response
 */
export function successResponse<T>(
  data: T,
  status = 200,
  message?: string
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    { success: true, data, ...(message && { message }) },
    { status }
  );
}

/**
 * Create an error response
 */
export function errorResponse(
  error: string,
  code: ErrorCode,
  status: number,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  const body: ApiErrorResponse = { success: false, error, code };
  if (details !== undefined) {
    body.details = details;
  }
  return NextResponse.json(body, { status });
}

// Common error responses
export const ApiErrors = {
  unauthorized: (message = "Unauthorized") =>
    errorResponse(message, "UNAUTHORIZED", 401),

  forbidden: (message = "Forbidden") =>
    errorResponse(message, "FORBIDDEN", 403),

  notFound: (resource = "Resource") =>
    errorResponse(`${resource} not found`, "NOT_FOUND", 404),

  badRequest: (message: string, details?: unknown) =>
    errorResponse(message, "BAD_REQUEST", 400, details),

  validationError: (message: string, details?: unknown) =>
    errorResponse(message, "VALIDATION_ERROR", 400, details),

  duplicate: (message = "Duplicate entry") =>
    errorResponse(message, "DUPLICATE", 409),

  conflict: (message: string) =>
    errorResponse(message, "CONFLICT", 409),

  rateLimited: (retryAfter: number) =>
    NextResponse.json(
      { success: false, error: "Too many requests", code: "RATE_LIMITED" },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      }
    ),

  internal: (message = "Internal server error") =>
    errorResponse(message, "INTERNAL_ERROR", 500),

  permissionDenied: (permission: string) =>
    errorResponse(`Permission denied: ${permission}`, "PERMISSION_DENIED", 403),

  businessRule: (message: string, code?: string) =>
    errorResponse(message, "BUSINESS_RULE_VIOLATION", 400, code ? { code } : undefined),
};

/**
 * Safely extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unexpected error occurred";
}

/**
 * Handle common errors and return appropriate response
 */
export function handleApiError(error: unknown, logger?: { error: (msg: string, err: Error) => void }): NextResponse {
  const message = getErrorMessage(error);

  // Log if logger provided
  if (logger && error instanceof Error) {
    logger.error("API Error", error);
  }

  // Check for known error types
  if (error instanceof Error) {
    const name = error.name;
    
    // Prisma errors
    if (name === "PrismaClientKnownRequestError") {
      const prismaError = error as any;
      if (prismaError.code === "P2002") {
        return ApiErrors.duplicate("A record with this value already exists");
      }
      if (prismaError.code === "P2025") {
        return ApiErrors.notFound("Record");
      }
    }

    // Permission errors
    if (name === "PermissionError") {
      return ApiErrors.permissionDenied(message);
    }

    // Business rule errors
    if (name === "BusinessRuleViolation") {
      return ApiErrors.businessRule(message);
    }
  }

  if (process.env.NODE_ENV === "production") {
    return ApiErrors.internal("Internal server error");
  }

  return ApiErrors.internal(message);
}

/**
 * Request body size limit check
 */
export const MAX_BODY_SIZE = 1024 * 1024; // 1MB

export async function parseBodyWithLimit(request: Request): Promise<{ ok: true; body: unknown } | { ok: false; error: NextResponse }> {
  const contentLength = request.headers.get("content-length");
  
  if (contentLength && parseInt(contentLength) > MAX_BODY_SIZE) {
    return {
      ok: false,
      error: ApiErrors.badRequest("Request body too large", { maxSize: MAX_BODY_SIZE }),
    };
  }

  try {
    const body = await request.json();
    return { ok: true, body };
  } catch {
    return {
      ok: false,
      error: ApiErrors.badRequest("Invalid JSON body"),
    };
  }
}

/**
 * Validate enum value
 */
export function validateEnum<T extends string>(
  value: string | null | undefined,
  enumObj: Record<string, T>,
  fieldName: string
): { ok: true; value: T | null } | { ok: false; error: NextResponse } {
  if (!value) {
    return { ok: true, value: null };
  }

  const validValues = Object.values(enumObj);
  if (!validValues.includes(value as T)) {
    return {
      ok: false,
      error: ApiErrors.validationError(
        `Invalid ${fieldName}. Must be one of: ${validValues.join(", ")}`,
        { field: fieldName, validValues }
      ),
    };
  }

  return { ok: true, value: value as T };
}
