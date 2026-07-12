/**
 * Unified API helpers (`ApiErrors`, `parseQueryParams`, `validateEnumParam`) are used across routes.
 *
 * `createApiHandler` is an optional wrapper (auth + rate limit + body parse + errors). Most routes
 * still implement those steps inline for historical reasons. Prefer this wrapper for new or
 * high-risk routes; full migration is incremental — do not delete without replacing call sites.
 */

import { NextRequest, NextResponse } from "next/server";
import { Session } from "next-auth";
import { auth } from "./auth";
import { withRateLimit, Tier } from "./middleware/rate-limit";
import { requirePermission, Permission, PermissionError } from "./permissions";
import { ApiErrors, getErrorMessage, parseBodyWithLimit, validateEnum } from "./api-response";
import { BusinessRuleViolation } from "./crud-business-validation";
import { createLogger } from "./logger";
import { z } from "zod";

const logger = createLogger("api-handler");

interface HandlerOptions {
  /** Rate limit tier */
  rateLimit?: Tier;
  /** Required permission (null = no permission check, just auth) */
  permission?: Permission | null;
  /** Allow unauthenticated requests */
  public?: boolean;
  /** Require admin role */
  adminOnly?: boolean;
}

type HandlerContext<T = unknown> = {
  session: Session;
  body: T;
  params: Record<string, string>;
};

type RouteHandler<T = unknown> = (
  request: NextRequest,
  context: HandlerContext<T>
) => Promise<NextResponse>;

/**
 * Create an API handler with common middleware
 */
export function createApiHandler<T = unknown>(
  handler: RouteHandler<T>,
  options: HandlerOptions = {}
): (request: NextRequest, context?: { params?: Promise<Record<string, string>> }) => Promise<NextResponse> {
  const {
    rateLimit = "moderate",
    permission = null,
    public: isPublic = false,
    adminOnly = false,
  } = options;

  return async (request: NextRequest, routeContext?: { params?: Promise<Record<string, string>> }) => {
    try {
      // Rate limiting
      const rateLimitResponse = withRateLimit(request, rateLimit);
      if (rateLimitResponse) return rateLimitResponse;

      // Authentication
      const session = await auth();
      if (!isPublic && !session?.user?.id) {
        return ApiErrors.unauthorized();
      }

      // Admin check
      if (adminOnly && session?.user?.role !== "ADMIN") {
        return ApiErrors.forbidden("Admin access required");
      }

      // Permission check
      if (permission && session) {
        try {
          requirePermission(session, permission);
        } catch (error) {
          if (error instanceof PermissionError) {
            return ApiErrors.permissionDenied(permission);
          }
          throw error;
        }
      }

      // Parse body for POST/PUT/PATCH
      let body: T = {} as T;
      if (["POST", "PUT", "PATCH"].includes(request.method)) {
        const parsed = await parseBodyWithLimit(request);
        if (!parsed.ok) return parsed.error;
        body = parsed.body as T;
      }

      // Resolve params
      const params = routeContext?.params ? await routeContext.params : {};

      // Execute handler
      return await handler(request, {
        session: session!,
        body,
        params,
      });
    } catch (error) {
      return handleError(error);
    }
  };
}

/**
 * Centralized error handling
 */
function handleError(error: unknown): NextResponse {
  const message = getErrorMessage(error);

  // Known error types
  if (error instanceof PermissionError) {
    return ApiErrors.permissionDenied(message);
  }

  if (error instanceof BusinessRuleViolation) {
    return ApiErrors.businessRule(message, (error as any).code);
  }

  if (error instanceof z.ZodError) {
    return ApiErrors.validationError("Validation failed", error.issues);
  }

  // Prisma errors
  if (error instanceof Error) {
    const name = error.name;
    if (name === "PrismaClientKnownRequestError") {
      const prismaError = error as any;
      if (prismaError.code === "P2002") {
        return ApiErrors.duplicate("A record with this value already exists");
      }
      if (prismaError.code === "P2025") {
        return ApiErrors.notFound("Record");
      }
    }
  }

  // Log unexpected errors
  logger.error("Unhandled API error", error as Error);
  return ApiErrors.internal(message);
}

/**
 * Parse and validate query params with Zod schema
 */
export function parseQueryParams<T extends z.ZodType>(
  request: NextRequest,
  schema: T
): z.infer<T> | NextResponse {
  const params: Record<string, string> = {};
  request.nextUrl.searchParams.forEach((v, k) => {
    params[k] = v;
  });

  const result = schema.safeParse(params);
  if (!result.success) {
    return ApiErrors.validationError("Invalid query parameters", result.error.issues);
  }

  return result.data;
}

/**
 * Validate enum query param helper
 */
export function validateEnumParam<T extends Record<string, string>>(
  value: string | null,
  enumObj: T,
  paramName: string
): { value: T[keyof T] | null; error?: NextResponse } {
  const result = validateEnum(value, enumObj, paramName);
  if (!result.ok) {
    return { value: null, error: result.error };
  }
  return { value: result.value as T[keyof T] | null };
}

/** Return 404 when a feature flag is disabled (for routes not covered by middleware). */
export function requireFeatureFlag(enabled: boolean): NextResponse | null {
  if (!enabled) {
    return ApiErrors.notFound("Feature");
  }
  return null;
}

// Re-export for convenience
export { ApiErrors, getErrorMessage } from "./api-response";
export type { Permission } from "./permissions";
