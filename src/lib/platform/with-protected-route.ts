import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { ApiErrors } from "@/lib/api-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { requirePermission, PermissionError, type Permission } from "@/lib/permissions";

export type ProtectedRouteContext = {
  session: Session;
};

export type ProtectedRouteOptions = {
  rateLimit?: "lenient" | "moderate" | "strict";
  permission?: Permission;
};

/**
 * Thin auth + rate-limit wrapper for API routes (M0 bridge).
 */
export function withProtectedRoute(
  handler: (
    request: NextRequest,
    ctx: ProtectedRouteContext,
  ) => Promise<NextResponse>,
  options: ProtectedRouteOptions = {},
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const rl = withRateLimit(request, options.rateLimit ?? "lenient");
    if (rl) return rl;

    const session = await auth();
    if (!session?.user?.id) {
      return ApiErrors.unauthorized();
    }

    if (options.permission) {
      try {
        requirePermission(session, options.permission);
      } catch (e) {
        if (e instanceof PermissionError) {
          return ApiErrors.forbidden(
            e instanceof Error ? e.message : "Permission denied",
          );
        }
        throw e;
      }
    }

    return handler(request, { session });
  };
}
